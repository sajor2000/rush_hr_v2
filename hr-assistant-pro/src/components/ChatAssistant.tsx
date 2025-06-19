'use client';

import { EvaluationResult, JobType, EnhancedJobRequirements } from '@/types';
import { ChatMessage, ChatResponse } from '@/types/chat';
import React, { useState, useRef, useEffect } from 'react';

interface ChatAssistantProps {
  candidates?: EvaluationResult[];
  selectedCandidateId?: string;
  onCandidateSelect?: (candidateId: string) => void;
  jobDescription?: string;
  mustHaveAttributes?: string;
  jobInfo?: { jobType: JobType; jobRequirements: EnhancedJobRequirements } | null;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({
  candidates = [],
  selectedCandidateId,
  onCandidateSelect,
  jobDescription,
  mustHaveAttributes,
  jobInfo
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const selectedCandidate = candidates.find(c => c.candidateName === selectedCandidateId) || candidates[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    // Initialize with context-aware greeting
    const candidateName = selectedCandidate?.candidateName;
    const greeting = candidateName 
      ? `Hi! I'm your HR Copilot. I'm ready to help you analyze ${candidateName}'s profile. What would you like to know?`
      : candidates.length > 0
        ? `Hi! I'm your HR Copilot. Select a candidate above to get started, or ask general questions about the evaluation process.`
        : `Hi! I'm your HR Copilot. Complete an evaluation first, then I can help you analyze candidate profiles.`;

    setMessages([{
      id: 'initial-greeting',
      text: greeting,
      sender: 'assistant',
      timestamp: new Date()
    }]);

    // Set initial suggestions
    if (candidateName) {
      setSuggestions([
        `Why was ${candidateName} ranked in their tier?`,
        `What are ${candidateName}'s strongest qualifications?`,
        `Where does ${candidateName} show relevant experience?`
      ]);
    } else {
      setSuggestions([
        'How is the evaluation scoring calculated?',
        'What are the key must-have requirements?',
        'Explain the quartile ranking system'
      ]);
    }
  }, [selectedCandidate, candidates]);

  const handleSendMessage = async (messageText?: string) => {
    const queryText = messageText || input.trim();
    if (!queryText) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: queryText,  
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryText,
          candidateId: selectedCandidate?.candidateName,
          resumeText: selectedCandidate?.resumeText, // Assume this exists or will be added
          evaluationResult: selectedCandidate,
          jobDescription: jobDescription || jobInfo?.jobRequirements?.description,
          mustHaveAttributes: mustHaveAttributes || jobInfo?.jobRequirements?.mustHave?.join(', '),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json() as ChatResponse;
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '-assistant',
        text: data.response || 'I apologize, but I could not generate a response.',
        sender: 'assistant',
        timestamp: new Date(),
        intent: data.intent,
        confidence: data.confidence,
        sources: data.sources
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update suggestions if provided
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMsg);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        text: `Sorry, I encountered an error: ${errorMsg}`,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col max-h-[600px]">
      {/* Header with candidate selection */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-rush-green-dark dark:text-rush-green-light">
            HR Copilot
          </h2>
          {candidates.length > 0 && (
            <select
              value={selectedCandidateId || ''}
              onChange={(e) => onCandidateSelect?.(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">General Discussion</option>
              {candidates.map((candidate, index) => (
                <option key={candidate.candidateName || index} value={candidate.candidateName}>
                  {candidate.candidateName} ({candidate.tier})
                </option>
              ))}
            </select>
          )}
        </div>
        {selectedCandidate && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Discussing: <span className="font-medium text-rush-green-dark dark:text-rush-green-light">
              {selectedCandidate.candidateName}
            </span> • Score: {selectedCandidate.scores?.overall || 'N/A'} • {selectedCandidate.tier}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-grow p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-xl shadow ${
                message.sender === 'user'
                  ? 'bg-rush-green-DEFAULT text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              {message.sender === 'assistant' && (
                <div className="mt-2 space-y-1">
                  {message.intent && (
                    <p className="text-xs opacity-70">
                      Intent: {message.intent} {message.confidence && `(${Math.round(message.confidence * 100)}%)`}
                    </p>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <details className="text-xs opacity-70">
                      <summary className="cursor-pointer hover:opacity-100">Sources ({message.sources.length})</summary>
                      <ul className="mt-1 pl-4 list-disc">
                        {message.sources.slice(0, 3).map((source, idx) => (
                          <li key={idx} className="truncate">{source}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-3 rounded-xl shadow bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rush-green-DEFAULT"></div>
                <p className="text-sm">Analyzing...</p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-rush-green-light hover:text-rush-green-dark transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedCandidate 
              ? `Ask about ${selectedCandidate.candidateName}...`
              : 'Ask a question about the evaluation process...'
            }
            rows={1}
            className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rush-green-DEFAULT focus:border-transparent outline-none dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition resize-none"
            disabled={isLoading}
            style={{ minHeight: '44px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-rush-green-DEFAULT text-white rounded-lg hover:bg-rush-green-dark focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rush-green-DEFAULT transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed min-w-[60px]"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              'Send'
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatAssistant;
