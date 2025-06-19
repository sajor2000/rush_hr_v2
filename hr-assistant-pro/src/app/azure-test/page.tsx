'use client';

import { useState } from 'react';

export default function AzureTestPage() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testAzureIntegration = async () => {
    setIsLoading(true);
    setStatus('Testing Azure OpenAI integration...\n\n');

    try {
      // Test chat endpoint
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'Hello, are you using Azure OpenAI?',
          candidateId: 'test',
          resumeText: 'Test resume content',
          evaluationResult: {
            candidateId: 'test',
            candidateName: 'Test Candidate',
            scores: { overall: 85 },
            tier: 'Qualified' as const,
            explanation: 'Test evaluation'
          }
        }),
      });

      const chatData = await chatResponse.json();
      setStatus(prev => prev + '✅ Chat API Response:\n' + JSON.stringify(chatData, null, 2) + '\n\n');

      // Show configuration
      setStatus(prev => prev + '📋 Current Configuration:\n');
      setStatus(prev => prev + `USE_AZURE_OPENAI: ${process.env.NEXT_PUBLIC_USE_AZURE_OPENAI || 'Check server logs'}\n`);
      setStatus(prev => prev + '\nCheck the server console for detailed logs showing which service is being used.\n');

    } catch (error) {
      setStatus(prev => prev + '❌ Error: ' + (error as Error).message + '\n');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Azure OpenAI Integration Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={testAzureIntegration}
            disabled={isLoading}
            className="mb-4 px-4 py-2 bg-rush-green text-white rounded hover:bg-rush-green-dark disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test Azure Integration'}
          </button>

          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {status || 'Click the button to test Azure OpenAI integration'}
          </pre>

          <div className="mt-4 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click the test button above</li>
              <li>Check the server console (terminal running npm run dev) for detailed logs</li>
              <li>Look for messages like "💬 Chat Service using: Azure OpenAI"</li>
              <li>If you see Azure OpenAI in the logs, both resume and chat are using Azure</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}