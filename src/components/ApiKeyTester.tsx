'use client';

import React, { useState } from 'react';

interface ApiKeyTesterProps {
  className?: string;
}

export default function ApiKeyTester({ className = '' }: ApiKeyTesterProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const testApiKey = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/system/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'openai',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: '✅ API Key is working correctly!',
          details: data.message,
        });
      } else {
        setTestResult({
          success: false,
          message: '❌ API Key test failed',
          details: data.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: '❌ Network error during API test',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={`card p-6 card-hover ${className}`}>
      <h2 className="text-xl font-semibold text-rush-green mb-4">API Key Test</h2>
                <p className="text-sm text-gray-600 mb-4">
            Test your OpenAI API key to ensure it&apos;s properly configured and working.
          </p>
      
      <button
        onClick={testApiKey}
        disabled={isTesting}
        className="btn-secondary w-full mb-4"
      >
        {isTesting ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="loading-dots text-rush-green">
              <div></div>
              <div></div>
              <div></div>
            </div>
            <span>Testing API Key...</span>
          </div>
        ) : (
          'Test API Key'
        )}
      </button>

      {testResult && (
        <div className={`p-4 rounded-lg border ${
          testResult.success 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p className="font-semibold">{testResult.message}</p>
          {testResult.details && (
            <p className="text-sm mt-1 opacity-80">{testResult.details}</p>
          )}
        </div>
      )}
    </div>
  );
} 