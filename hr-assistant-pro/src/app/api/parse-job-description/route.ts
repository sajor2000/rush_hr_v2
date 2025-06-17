import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

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
      const { default: pdf } = await import('pdf-parse');
      const data = await pdf(buffer);
      text = data.text;
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
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during parsing.';
    return NextResponse.json({ error: `Failed to parse file: ${errorMessage}` }, { status: 500 });
  }
}
