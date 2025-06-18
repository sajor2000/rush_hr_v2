import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
// @ts-ignore -- Using the main build, relying on internal Node.js worker handling
import * as pdfjsLib from 'pdfjs-dist/build/pdf.js';
// @ts-ignore
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

// DO NOT set pdfjsLib.GlobalWorkerOptions.workerSrc
// Relying on pdfjs-dist to use its default 'fake' worker for Node.js environments.

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
      const uint8Array = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDoc = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: TextItem | TextMarkedContent) => ('str' in item ? (item as TextItem).str : '')).join(' ') + '\n';
      }
      text = fullText.trim();
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
