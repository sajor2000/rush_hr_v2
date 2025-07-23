import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  openai: {
    configured: boolean;
    model: string;
  };
  services: {
    name: string;
    status: 'operational' | 'error';
    responseTime?: number;
    error?: string;
  }[];
  systemInfo: {
    nodeVersion: string;
    platform: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

async function testService(
  client: OpenAI,
  serviceName: string,
  testPrompt: string
): Promise<{ status: 'operational' | 'error'; responseTime: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a test assistant. Reply with "OK".' },
        { role: 'user', content: testPrompt }
      ],
      temperature: 0.2,
      top_p: 0.90,
      max_tokens: 10
    });

    const responseTime = Date.now() - startTime;
    
    if (response.choices[0]?.message?.content) {
      return { status: 'operational', responseTime };
    } else {
      return { status: 'error', responseTime, error: 'Empty response' };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'error',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Get system info
    const memoryUsage = process.memoryUsage();
    const totalMemory = (await import('os')).totalmem();
    const usedMemory = memoryUsage.heapUsed + memoryUsage.external;
    
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        model: 'gpt-4o'
      },
      services: [],
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(usedMemory / 1024 / 1024),
          total: Math.round(totalMemory / 1024 / 1024),
          percentage: Math.round((usedMemory / totalMemory) * 100)
        }
      }
    };

    // Test Azure/OpenAI connectivity
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      
      // Test different services
      const services = [
        { name: 'Resume Evaluation', prompt: 'Test evaluation' },
        { name: 'Chat Service', prompt: 'Test chat' },
        { name: 'Job Classification', prompt: 'Test classification' },
        { name: 'Requirement Extraction', prompt: 'Test extraction' }
      ];

      for (const service of services) {
        const testResult = await testService(client, service.name, service.prompt);
        result.services.push({
          name: service.name,
          ...testResult
        });
      }

      // Determine overall health
      const failedServices = result.services.filter(s => s.status === 'error').length;
      if (failedServices === 0) {
        result.status = 'healthy';
      } else if (failedServices < result.services.length) {
        result.status = 'degraded';
      } else {
        result.status = 'unhealthy';
      }

    } catch (error) {
      result.status = 'unhealthy';
      result.services.push({
        name: 'AI Service Connection',
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to connect to AI service'
      });
    }

    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      ...result,
      totalResponseTime: totalTime
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'System check failed',
      totalResponseTime: Date.now() - startTime
    }, { status: 500 });
  }
}