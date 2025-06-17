import { NextRequest } from 'next/server';

import mammoth from 'mammoth';
import pLimit from 'p-limit';
import { createHash } from 'crypto';
import { detectJobType } from '@/lib/jobTypeDetector';
import { extractJobRequirements } from '@/lib/requirementExtractor';
import { evaluateCandidate } from '@/lib/candidateEvaluator';

// Import pdfjs-dist and TextItem type
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api'; // Path to TextItem type definition

// Set workerSrc for pdfjs-dist
// For Next.js API routes (Node.js environment), point to the worker file within the package
try {
  // This ensures that the worker is correctly bundled and located by Next.js/Vercel
  // Note: require.resolve might not work as expected in all Vercel build environments for all packages.
  // Using a direct path or ensuring the worker is part of the serverless function bundle is key.
  // For now, let's assume pdfjs-dist's main import handles worker loading or we use a CDN as fallback.
  // The 'pdfjs-dist/webpack' entry point is often recommended for these environments.
  // Let's try to set it to the CDN by default if direct resolution is complex.
  const version = (pdfjsLib as any).version || '4.0.379'; // Use a recent pdfjs-dist version
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
  console.log(`pdfjs-dist workerSrc set to CDN: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
} catch (e) {
  console.error("Critical error setting pdfjsLib.GlobalWorkerOptions.workerSrc. PDF processing may fail.", e);
}


// In-memory cache for evaluation results
const evaluationCache = new Map<string, any>();

// Limit concurrency for file parsing
const parsingLimit = pLimit(10);
// A more conservative limit for AI API calls to avoid rate limiting
const evaluationLimit = pLimit(5);

// Helper to encode SSE messages
const encoder = new TextEncoder();
function createSseStream(data: any, eventName?: string) {
  let message = `data: ${JSON.stringify(data)}\n\n`;
  if (eventName) {
    message = `event: ${eventName}\n${message}`;
  }
  return encoder.encode(message);
}

async function parseResume(file: File): Promise<{ fileName: string; text: string; buffer: Buffer; error?: string }> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  try {
    let text = '';

    if (file.type === 'application/pdf') {
      const uint8Array = new Uint8Array(fileBuffer);
      // Note: getDocument can accept various types, including Uint8Array or an object with data.
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDoc = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        // textContent.items can be an array of TextItem or TextMarkedContent
        fullText += textContent.items.map((item: TextItem | import('pdfjs-dist/types/src/display/api').TextMarkedContent) => ('str' in item ? (item as TextItem).str : '')).join(' ') + '\n';
      }
      text = fullText.trim();
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
      text = value;
    } else {
      return { fileName: file.name, text: '', buffer: fileBuffer, error: 'Unsupported file type' };
    }

    return { fileName: file.name, text, buffer: fileBuffer };
  } catch (error) {
    console.error(`Error parsing ${file.name}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { fileName: file.name, text: '', buffer: fileBuffer, error: `Failed to parse file: ${errorMessage}` };
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const jobDescription = formData.get('jobDescription') as string;
  const files = formData.getAll('resumes') as File[];

  if (!jobDescription || files.length === 0) {
    return new Response(JSON.stringify({ error: 'Job description and resumes are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Analyze Job Description
        controller.enqueue(createSseStream({ message: 'Analyzing job description...' }, 'status_update'));
        const jobType = await detectJobType(jobDescription);
        const jobRequirements = await extractJobRequirements(jobDescription, jobType);
        
        // Send initial job info to the client
        controller.enqueue(createSseStream({ jobType, jobRequirements }, 'job_info'));

        // Step 2: Parse all resumes
        controller.enqueue(createSseStream({ message: `Parsing ${files.length} resume(s)...` }, 'status_update'));
        const parsedResumes = await Promise.all(
          files.map(file => parsingLimit(() => parseResume(file)))
        );

        // Step 3: Evaluate each resume and stream results
        controller.enqueue(createSseStream({ message: 'Scoring candidates...' }, 'status_update'));
        const evaluationPromises = parsedResumes.map(resume => {
          return evaluationLimit(async () => {
            const hash = createHash('sha256').update(resume.buffer).digest('hex');

            // Check cache first
            if (evaluationCache.has(hash)) {
              const cachedResult = evaluationCache.get(hash);
              controller.enqueue(createSseStream({ ...cachedResult, fromCache: true }, 'evaluation_result'));
              return;
            }

            if (resume.error || !resume.text) {
              controller.enqueue(createSseStream({ 
                candidateId: resume.fileName, 
                error: `Failed to parse: ${resume.error || 'Empty content'}` 
              }, 'evaluation_error'));
              return;
            }
            
            try {
              const result = await evaluateCandidate(resume.text, resume.fileName, jobRequirements);
              // Store result in cache
              evaluationCache.set(hash, result);
              controller.enqueue(createSseStream(result, 'evaluation_result'));
            } catch (evalError) {
              const message = evalError instanceof Error ? evalError.message : 'Unknown evaluation error';
              controller.enqueue(createSseStream({ 
                candidateId: resume.fileName, 
                error: message
              }, 'evaluation_error'));
            }
          });
        });

        await Promise.all(evaluationPromises);

        // Signal completion
        controller.enqueue(createSseStream({ message: 'done' }, 'done'));

      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        controller.enqueue(createSseStream({ error: message }, 'error'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
