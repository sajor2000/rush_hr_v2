import { NextRequest } from 'next/server';

import mammoth from 'mammoth';
import pLimit from 'p-limit';
import { createHash } from 'crypto';
import { detectJobType } from '@/lib/jobTypeDetector';
import { extractJobRequirements } from '@/lib/requirementExtractor';
import { evaluateCandidate } from '@/lib/candidateEvaluator';
import { preprocessResume, estimateTokens } from '@/lib/resumePreprocessor';

import { PdfReader } from 'pdfreader';
import { logger } from '@/lib/logger';
import { LRUCache } from '@/lib/lruCache';
import { getCorsHeaders } from '@/lib/corsHeaders';

async function parsePdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    let content = "";
    let itemCount = 0;
    const startTime = Date.now();
    
    new PdfReader(null).parseBuffer(buffer, (err, item) => {
      if (err) {
        logger.error('PDF parsing failed', err, { 
          fileType: 'pdf',
          bufferSize: buffer.length,
          itemsProcessed: itemCount
        });
        reject(new Error(`Failed to parse PDF: ${err.message || 'Unknown PDF parsing error'}`));
      } else if (!item) {
        // End of buffer, PDF parsing is finished.
        const duration = Date.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
          logger.debug('PDF parsing completed', { 
            itemCount, 
            contentLength: content.length,
            duration 
          });
        }
        resolve(content.trim());
      } else if (item.text) {
        itemCount++;
        content += item.text + " "; // Add a space to separate text items
      }
    });
  });
}

// In-memory cache for evaluation results with LRU eviction and TTL
// Max 100 entries, 60 minutes TTL
const evaluationCache = new LRUCache<string, Record<string, unknown>>(100, 60);

// Limit concurrency for file parsing - optimized for stability
const parsingLimit = pLimit(3); // Reduced to prevent memory issues
const BATCH_SIZE = 5; // Process resumes in smaller batches

// Helper to encode SSE messages
const encoder = new TextEncoder();
function createSseStream(data: unknown, eventName?: string) {
  let message = `data: ${JSON.stringify(data)}\n\n`;
  if (eventName) {
    message = `event: ${eventName}\n${message}`;
  }
  return encoder.encode(message);
}

async function parseResume(file: File): Promise<{ fileName: string; text: string; buffer: Buffer; error?: string }> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  
  // Add timeout protection for parsing (30 seconds per file)
  const parseWithTimeout = async (): Promise<string> => {
    return Promise.race([
      (async () => {
        if (file.type === 'application/pdf') {
          return await parsePdf(fileBuffer);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
          return value;
        } else {
          throw new Error('Unsupported file type');
        }
      })(),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('File parsing timeout (30s)')), 30000)
      )
    ]);
  };

  try {
    const text = await parseWithTimeout();
    return { fileName: file.name, text, buffer: fileBuffer };
  } catch (error) {
    logger.error('Resume parsing failed', error, { fileName: file.name });
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { fileName: file.name, text: '', buffer: fileBuffer, error: `Failed to parse file: ${errorMessage}` };
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const origin = req.headers.get('origin');
  logger.apiRequest('POST', '/api/evaluate', { origin });
  const formData = await req.formData();
  const jobDescription = formData.get('jobDescription') as string;
  const _mustHaveAttributes = formData.get('mustHaveAttributes') as string | null;
  const files = formData.getAll('resumes') as File[];

  if (!jobDescription || files.length === 0) {
    return new Response(JSON.stringify({ error: 'Job description and resumes are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate file sizes (max 5MB per file)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        error: `File "${file.name}" exceeds the 5MB size limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
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

        // Step 2: Process resumes in batches to avoid memory issues
        let completedCount = 0;
        let errorCount = 0;
        const totalFiles = files.length;
        
        controller.enqueue(createSseStream({ 
          message: `Processing ${totalFiles} resume(s) in batches of ${BATCH_SIZE}...`,
          total: totalFiles 
        }, 'status_update'));

        // Process files in batches
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
          const batch = files.slice(i, Math.min(i + BATCH_SIZE, files.length));
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(files.length / BATCH_SIZE);
          
          controller.enqueue(createSseStream({ 
            message: `Processing batch ${batchNumber} of ${totalBatches} (${batch.length} files)...`,
            progress: completedCount,
            total: totalFiles
          }, 'progress_update'));

          // Parse batch of resumes with limited concurrency
          const parsedBatch = await Promise.all(
            batch.map(file => parsingLimit(() => parseResume(file)))
          );

          // Process each resume in the batch
          for (const resume of parsedBatch) {
          try {
            const hash = createHash('sha256').update(resume.buffer).digest('hex');

            // Check cache first
            if (evaluationCache.has(hash)) {
              const cachedResult = evaluationCache.get(hash);
              if (cachedResult) {
                // Ensure cached results also have resumeText
                const resultWithResumeText = {
                  ...cachedResult,
                  resumeText: (cachedResult.resumeText as string) || resume.text,
                  fromCache: true
                };
                controller.enqueue(createSseStream(resultWithResumeText, 'evaluation_result'));
                completedCount++;
                continue;
              }
            }

            if (resume.error || !resume.text) {
              controller.enqueue(createSseStream({ 
                candidateId: resume.fileName, 
                error: `Failed to parse: ${resume.error || 'Empty content'}` 
              }, 'evaluation_error'));
              errorCount++;
              completedCount++;
              continue;
            }
            
            // Preprocess resume to optimize tokens
            const processedText = preprocessResume(resume.text);
            const tokenEstimate = estimateTokens(processedText);
            
            if (process.env.NODE_ENV === 'development') {
              logger.debug(`Resume token optimization`, {
                fileName: resume.fileName,
                tokensAfter: tokenEstimate,
                tokensBefore: estimateTokens(resume.text)
              });
            }
            
            const result = await evaluateCandidate(processedText, resume.fileName, jobRequirements);
            // Add resume text to the result for chat functionality
            const resultWithResumeText = {
              ...result,
              resumeText: resume.text
            };
            // Store result in cache
            evaluationCache.set(hash, resultWithResumeText);
            controller.enqueue(createSseStream(resultWithResumeText, 'evaluation_result'));
            
            completedCount++;
            
            // Update progress after each resume
            const percentage = Math.round((completedCount / totalFiles) * 100);
            controller.enqueue(createSseStream({ 
              message: `Evaluated ${completedCount} of ${totalFiles} resumes (${percentage}%)...`,
              progress: completedCount,
              total: totalFiles,
              percentage: percentage
            }, 'progress_update'));
            
          } catch (evalError) {
            const message = evalError instanceof Error ? evalError.message : 'Unknown evaluation error';
            errorCount++;
            completedCount++;
            
            controller.enqueue(createSseStream({ 
              candidateId: resume.fileName, 
              error: message,
              retryable: !message.includes('API key') && !message.includes('401')
            }, 'evaluation_error'));
            
            // Update progress even on error
            const percentage = Math.round((completedCount / totalFiles) * 100);
            controller.enqueue(createSseStream({ 
              message: `Evaluated ${completedCount} of ${totalFiles} resumes (${percentage}%)...`,
              progress: completedCount,
              total: totalFiles,
              percentage: percentage
            }, 'progress_update'));
          }
          } // End of batch processing
          
          // Optional: Add a small delay between batches to prevent overload
          if (i + BATCH_SIZE < files.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Final summary
        const successCount = completedCount - errorCount;
        const failureCount = errorCount;
        
        // Send batch summary
        if (failureCount > 0) {
          controller.enqueue(createSseStream({ 
            message: `Processing complete: ${successCount} succeeded, ${failureCount} failed`,
            summary: {
              total: totalFiles,
              succeeded: successCount,
              failed: failureCount
            }
          }, 'batch_summary'));
        }

        // Signal completion
        controller.enqueue(createSseStream({ message: 'done' }, 'done'));
        
        logger.apiResponse('POST', '/api/evaluate', 200, Date.now() - startTime, {
          totalResumes: totalFiles,
          succeeded: completedCount - errorCount,
          failed: errorCount
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        controller.enqueue(createSseStream({ error: message }, 'error'));
        logger.apiError('POST', '/api/evaluate', error);
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
      ...getCorsHeaders(origin),
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}
