import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('The OPENAI_API_KEY environment variable is not set. Please add it to your .env.local file.');
    }

    const openai = new OpenAI({ apiKey });

    // A lightweight request to verify API key validity
    await openai.models.list();
    return NextResponse.json({ success: true, message: 'OpenAI API key is valid and connected.' });

  } catch (error) {
    console.error('OpenAI API key test failed:', error);
    
    let friendlyMessage = 'An unknown error occurred.';
    if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
            friendlyMessage = 'Authentication failed. The provided API key is incorrect or has been revoked.';
        } else if (error.status === 429) {
            friendlyMessage = 'Rate limit or quota exceeded. Please check your OpenAI plan and billing details.';
        } else {
            friendlyMessage = `A server-side error occurred: ${error.message}`;
        }
    } else if (error instanceof Error) {
        friendlyMessage = error.message;
    }

    return NextResponse.json({ success: false, error: friendlyMessage }, { status: 500 });
  }
}
