'use client';

import { EvaluationResult, JobType, EnhancedJobRequirements } from '@/types';
import { ChatMessage, ChatResponse } from '@/types/chat';
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  MinusIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface FloatingChatWidgetProps {
  candidates?: EvaluationResult[];
  selectedCandidateId?: string;
  onCandidateSelect?: (candidateId: string) => void;
  jobDescription?: string;
  mustHaveAttributes?: string;
  jobInfo?: { jobType: JobType; jobRequirements: EnhancedJobRequirements } | null;
}

const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  candidates = [],
  selectedCandidateId,
  onCandidateSelect,
  jobDescription,
  mustHaveAttributes,
  jobInfo
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedCandidate = candidates.find(c => c.candidateName === selectedCandidateId) || candidates[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Initialize with context-aware greeting when opened
      const candidateName = selectedCandidate?.candidateName;
      const greeting = candidateName 
        ? `Hi! I'm your HR Copilot. I'm ready to help you analyze ${candidateName}'s profile. What would you like to know?`
        : candidates.length > 0
          ? `Hi! I'm your HR Copilot. Select a candidate to get started, or ask general questions about the evaluation process.`
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

      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, selectedCandidate, candidates]);

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
    setHasNewMessage(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryText,
          candidateId: selectedCandidate?.candidateName,
          resumeText: selectedCandidate?.resumeText,
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

      // Show notification if widget is closed or minimized
      if (!isOpen || isMinimized) {
        setHasNewMessage(true);
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

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    setHasNewMessage(false);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setHasNewMessage(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleWidget}
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-rush-green/20 ${
            hasNewMessage 
              ? 'bg-gradient-to-r from-rush-green to-rush-green-dark animate-pulse' 
              : 'bg-rush-green hover:bg-rush-green-dark'
          }`}
          aria-label="Open HR Copilot Chat"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
          {hasNewMessage && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></div>
          )}
          {candidates.length > 0 && (
            <div className="absolute -top-2 -left-2 h-5 w-5 bg-rush-charcoal text-white text-xs rounded-full flex items-center justify-center font-medium">
              {candidates.length}
            </div>
          )}
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
          isMinimized ? 'h-14' : 'h-96 w-80'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rush-green to-rush-green-dark text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              <h3 className="font-semibold text-sm">HR Copilot</h3>
              {selectedCandidate && !isMinimized && (
                <span className="text-xs opacity-90">• {selectedCandidate.candidateName}</span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleMinimize}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <button
                onClick={toggleWidget}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Close chat"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Candidate Selection */}
              {candidates.length > 0 && (
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <select
                    value={selectedCandidateId || ''}
                    onChange={(e) => onCandidateSelect?.(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:ring-2 focus:ring-rush-green focus:border-transparent"
                  >
                    <option value="">General Discussion</option>
                    {candidates.map((candidate, index) => (
                      <option key={candidate.candidateName || index} value={candidate.candidateName}>
                        {candidate.candidateName} ({candidate.tier})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Messages */}
              <div className="flex-grow p-3 space-y-3 overflow-y-auto h-48 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-2 rounded-lg text-xs ${
                        message.sender === 'user'
                          ? 'bg-rush-green text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      {message.sender === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-gray-200">
                          <p className="text-xs opacity-70 flex items-center">
                            <InformationCircleIcon className="h-3 w-3 mr-1" />
                            {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] p-2 rounded-lg bg-gray-100 text-gray-800">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-rush-green"></div>
                        <p className="text-xs">Analyzing...</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && !isLoading && (
                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                  <div className="flex flex-wrap gap-1">
                    {suggestions.slice(0, 2).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs px-2 py-1 bg-white text-rush-green border border-rush-green/20 rounded-full hover:bg-rush-green hover:text-white transition-colors"
                      >
                        {suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="px-3 py-2 bg-red-50 border-t border-red-200">
                  <p className="text-xs text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    {error}
                  </p>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-gray-100">
                <div className="flex items-end space-x-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedCandidate 
                      ? `Ask about ${selectedCandidate.candidateName}...`
                      : 'Ask a question...'
                    }
                    rows={1}
                    className="flex-grow p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-rush-green focus:border-transparent outline-none resize-none"
                    disabled={isLoading}
                    style={{ minHeight: '32px', maxHeight: '80px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                    }}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !input.trim()}
                    className="p-2 bg-rush-green text-white rounded-lg hover:bg-rush-green-dark focus:outline-none focus:ring-2 focus:ring-rush-green/20 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    ) : (
                      <PaperAirplaneIcon className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingChatWidget;
