import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PdfReader } from 'pdfreader';
import { getCorsHeaders } from '@/lib/corsHeaders';
import { withSecurityHeaders } from '@/lib/securityHeaders';
import { logger } from '@/lib/logger';

async function parsePdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    let content = "";
    new PdfReader(null).parseBuffer(buffer, (err, item) => {
      if (err) {
        logger.error('Error parsing PDF (job description) with pdfreader:', err);
        reject(new Error(`Failed to parse PDF (job description): ${err.message || 'Unknown PDF parsing error'}`));
      } else if (!item) {
        // End of buffer, PDF parsing is finished.
        resolve(content.trim());
      } else if (item.text) {
        content += item.text + " "; // Add a space to separate text items
      }
    });
  });
}

async function getFileBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  try {
    const formData = await req.formData();
    const file = formData.get('jobDescriptionFile') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { 
        status: 400,
        headers: withSecurityHeaders(getCorsHeaders(origin))
      });
    }

    const buffer = await getFileBuffer(file);
    let text = '';

    if (file.type === 'application/pdf') {
      text = await parsePdf(buffer);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { value } = await mammoth.extractRawText({ buffer });
      text = value;
    } else if (file.type === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type.' }, { 
        status: 400,
        headers: withSecurityHeaders(getCorsHeaders(origin))
      });
    }

    return NextResponse.json({ extractedText: text }, {
      headers: withSecurityHeaders(getCorsHeaders(origin))
    });

  } catch (error) {
    logger.error('Error parsing job description:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to parse file: ${errorMessage}` }, { 
      status: 500,
      headers: withSecurityHeaders(getCorsHeaders(origin))
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new Response(null, {
    status: 200,
    headers: withSecurityHeaders(getCorsHeaders(origin))
  });
}
