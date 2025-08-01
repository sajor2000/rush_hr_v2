import { NextRequest } from 'next/server';

import mammoth from 'mammoth';
import pLimit from 'p-limit';
import { createHash } from 'crypto';
import { detectJobType } from '@/lib/jobTypeDetector';
import { extractJobRequirements } from '@/lib/requirementExtractor';
import { evaluateCandidate } from '@/lib/candidateEvaluator';
import { evaluateCandidateV2 } from '@/lib/candidateEvaluatorV2';
import { preprocessResume, estimateTokens } from '@/lib/resumePreprocessor';

import { PdfReader } from 'pdfreader';
import { logger } from '@/lib/logger';
import { LRUCache } from '@/lib/lruCache';
import { getCorsHeaders } from '@/lib/corsHeaders';
import { withSecurityHeaders } from '@/lib/securityHeaders';

async function parsePdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    let content = "";
    let itemCount = 0;
    let pageCount = 0;
    const startTime = Date.now();
    const contentParts: string[] = [];
    
    // Safety timeout for PDF parsing (9 seconds for Vercel compatibility)
    const timeout = setTimeout(() => {
      logger.warn('PDF parsing taking too long, returning partial content', {
        itemCount,
        pageCount,
        contentLength: content.length
      });
      resolve(content.trim() || contentParts.join(' ').trim());
    }, 9000);
    
    try {
      new PdfReader(null).parseBuffer(buffer, (err, item) => {
        if (err) {
          clearTimeout(timeout);
          logger.error('PDF parsing failed', err, { 
            fileType: 'pdf',
            bufferSize: buffer.length,
            itemsProcessed: itemCount,
            pagesProcessed: pageCount
          });
          
          // Return partial content if available
          const partialContent = content.trim() || contentParts.join(' ').trim();
          if (partialContent.length > 100) {
            logger.info('Returning partial PDF content after error', {
              contentLength: partialContent.length
            });
            resolve(partialContent);
          } else {
            reject(new Error(`PDF parsing error: ${err.message || 'Unknown error'}`));
          }
        } else if (!item) {
          // End of buffer, PDF parsing is finished.
          clearTimeout(timeout);
          const duration = Date.now() - startTime;
          const finalContent = content.trim() || contentParts.join(' ').trim();
          
          logger.info('PDF parsing completed', { 
            itemCount, 
            pageCount,
            contentLength: finalContent.length,
            duration,
            averageItemsPerPage: pageCount > 0 ? Math.round(itemCount / pageCount) : 0
          });
          
          resolve(finalContent);
        } else if (item.text) {
          itemCount++;
          const text = item.text.trim();
          if (text) {
            content += text + " ";
            contentParts.push(text);
          }
        } else if (item.page) {
          pageCount = item.page;
          // Add page break for better text structure
          content += "\n\n";
        }
      });
    } catch (parseError) {
      clearTimeout(timeout);
      logger.error('PDF parser threw exception', parseError);
      reject(new Error('PDF parser exception'));
    }
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
        } else if (file.type.startsWith('image/')) {
          throw new Error('Image files (PNG/JPG/JPEG) are not supported. Please convert to PDF or DOCX format.');
        } else {
          throw new Error(`Unsupported file type: ${file.type}. Only PDF and DOCX files are supported.`);
        }
      })(),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('File parsing timeout (30s)')), 30000)
      )
    ]);
  };

  try {
    const text = await parseWithTimeout();
    
    // Validate parsed content
    if (!text || text.trim().length === 0) {
      logger.warn('Resume parsed but contains no text', { 
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });
      return { 
        fileName: file.name, 
        text: '', 
        buffer: fileBuffer, 
        error: 'File appears to be empty or could not extract text' 
      };
    }
    
    // Check for minimum content (at least 100 characters)
    if (text.trim().length < 100) {
      logger.warn('Resume has very little content', { 
        fileName: file.name,
        textLength: text.length,
        preview: text.substring(0, 50)
      });
    }
    
    // Log successful parsing
    logger.info('Resume parsed successfully', {
      fileName: file.name,
      textLength: text.length,
      wordCount: text.split(/\s+/).length
    });
    
    return { fileName: file.name, text, buffer: fileBuffer };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Enhanced error logging with more context
    logger.error('Resume parsing failed', error, { 
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      isTimeout: errorMessage.includes('timeout')
    });
    
    // More specific error messages
    let userFriendlyError = 'Failed to parse file';
    if (errorMessage.includes('timeout')) {
      userFriendlyError = 'File took too long to parse (timeout after 30s)';
    } else if (errorMessage.includes('Unsupported file type')) {
      userFriendlyError = `Unsupported file type: ${file.type}. Please use PDF or DOCX`;
    } else if (errorMessage.includes('PDF')) {
      userFriendlyError = 'PDF parsing error - file may be corrupted or use unsupported features';
    }
    
    return { fileName: file.name, text: '', buffer: fileBuffer, error: userFriendlyError };
  }
}

export async function POST(req: NextRequest) {
  // Validate environment variables first
  const { validateEnvironment } = await import('@/lib/envMiddleware');
  const envError = validateEnvironment();
  if (envError) {
    return envError;
  }

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
            
            // Check if preprocessing should be skipped
            const skipPreprocessing = process.env.SKIP_RESUME_PREPROCESSING === 'true';
            const originalTokens = estimateTokens(resume.text);
            const TOKEN_THRESHOLD = 20000; // Only preprocess if exceeds this (≈80k characters)
            
            let textToEvaluate = resume.text;
            let wasPreprocessed = false;
            
            // Only preprocess if not skipped and tokens exceed threshold
            if (!skipPreprocessing && originalTokens > TOKEN_THRESHOLD) {
              const processedText = preprocessResume(resume.text);
              const processedTokens = estimateTokens(processedText);
              
              // Use processed text only if it retains enough content
              if (processedText.length >= resume.text.length * 0.5) {
                textToEvaluate = processedText;
                wasPreprocessed = true;
                
                if (process.env.NODE_ENV === 'development') {
                  logger.debug(`Resume preprocessing applied`, {
                    fileName: resume.fileName,
                    originalTokens,
                    processedTokens,
                    tokenReduction: `${((originalTokens - processedTokens) / originalTokens * 100).toFixed(1)}%`
                  });
                }
              }
            }
            
            if (process.env.NODE_ENV === 'development') {
              logger.debug(`Resume preprocessing decision`, {
                fileName: resume.fileName,
                skipPreprocessing,
                originalTokens,
                exceedsThreshold: originalTokens > TOKEN_THRESHOLD,
                wasPreprocessed,
                originalLength: resume.text.length,
                finalLength: textToEvaluate.length
              });
            }
            
            // Use new rubric-based evaluation if enabled
            const useRubricScoring = process.env.USE_RUBRIC_SCORING === 'true' || true; // Default to new system
            const result = useRubricScoring 
              ? await evaluateCandidateV2(textToEvaluate, resume.fileName, jobRequirements)
              : await evaluateCandidate(textToEvaluate, resume.fileName, jobRequirements);
            
            // Add resume text to the result for chat functionality
            // Limit response size for Vercel (remove large resume text if over 1MB)
            const MAX_RESUME_SIZE = 1024 * 1024; // 1MB
            const resultWithResumeText = {
              ...result,
              resumeText: resume.text.length < MAX_RESUME_SIZE ? resume.text : '[Resume text too large to include]'
            };
            
            // Store result in cache (with full text for internal use)
            evaluationCache.set(hash, { ...result, resumeText: resume.text });
            
            // Send result to client (with size-limited text)
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
    headers: withSecurityHeaders({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...getCorsHeaders(origin),
    }),
  });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new Response(null, {
    status: 200,
    headers: withSecurityHeaders(getCorsHeaders(origin)),
  });
}
