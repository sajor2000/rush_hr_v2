import { NextRequest } from 'next/server';

import mammoth from 'mammoth';
import pLimit from 'p-limit';
import { createHash } from 'crypto';
import { detectJobType } from '@/lib/jobTypeDetector';
import { extractJobRequirements } from '@/lib/requirementExtractor';
import { evaluateCandidate } from '@/lib/candidateEvaluator';

import { PdfReader } from 'pdfreader';

async function parsePdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    let content = "";
    new PdfReader(null).parseBuffer(buffer, (err, item) => {
      if (err) {
        console.error('Error parsing PDF with pdfreader:', err);
        reject(new Error(`Failed to parse PDF: ${err.message || 'Unknown PDF parsing error'}`));
      } else if (!item) {
        // End of buffer, PDF parsing is finished.
        resolve(content.trim());
      } else if (item.text) {
        content += item.text + " "; // Add a space to separate text items
      }
    });
  });
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
      text = await parsePdf(fileBuffer);
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
  const mustHaveAttributes = formData.get('mustHaveAttributes') as string | null;
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
