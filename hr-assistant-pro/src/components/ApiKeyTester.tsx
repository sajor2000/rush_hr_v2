'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function ApiKeyTester() {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleTestKey = async () => {
    setTestStatus('testing');
    setMessage('');

    try {
      const response = await fetch('/api/test-openai', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An unknown error occurred.');
      }

      setTestStatus('success');
      setMessage(data.message);
    } catch (error) {
      setTestStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setMessage(errorMessage);
    }
  };

  const getStatusIndicator = () => {
    switch (testStatus) {
      case 'testing':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rush-blue"></div>;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-rush-green" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-rush-blue-dark">OpenAI API Key</h3>
          <p className="text-sm text-neutral-gray-dark mt-1">Verify your API key is configured correctly.</p>
        </div>
        <button
          onClick={handleTestKey}
          disabled={testStatus === 'testing'}
          className="px-4 py-2 border border-rush-green text-sm font-medium rounded-lg text-rush-green hover:bg-rush-green-lightest transition disabled:bg-neutral-gray-light disabled:cursor-not-allowed"
        >
          {testStatus === 'testing' ? 'Testing...' : 'Test Key'}
        </button>
      </div>
      {message && (
        <div className={`mt-3 flex items-center gap-2 p-3 rounded-md text-sm ${testStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {getStatusIndicator()}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
