import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { testType } = await req.json();

    if (testType === 'openai') {
      // Test OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'OPENAI_API_KEY is not configured' },
          { status: 500 }
        );
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Make a simple test call
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Please respond with "API test successful" if you can read this message.',
          },
        ],
        max_tokens: 10,
        temperature: 0,
      });

      const result = response.choices[0]?.message?.content;

      if (result && result.includes('successful')) {
        return NextResponse.json({
          success: true,
          message: 'OpenAI API key is working correctly',
          model: response.model,
          usage: response.usage,
        });
      } else {
        return NextResponse.json(
          { error: 'Unexpected response from OpenAI API' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid test type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('API test error:', error);
    
    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Invalid API key - please check your OpenAI API key configuration' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded - please try again later' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        return NextResponse.json(
          { error: 'OpenAI service temporarily unavailable' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to test API key' },
      { status: 500 }
    );
  }
}