import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse-fork';

async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    if (!data.text.trim()) {
      console.warn('PDF parsing with pdf-parse-fork resulted in empty text content for job description.');
    }
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF (job description) with pdf-parse-fork:', error);
    throw new Error(`Failed to parse PDF (job description): ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getFileBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('jobDescriptionFile') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
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
      return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
    }

    return NextResponse.json({ extractedText: text });

  } catch (error) {
    console.error('Error parsing job description:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to parse file: ${errorMessage}` }, { status: 500 });
  }
}
