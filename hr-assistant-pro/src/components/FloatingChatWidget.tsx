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
import { MessageFormatter } from './MessageFormatter';

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

  // Track if chat has been initialized to avoid resetting messages
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (isOpen && !isMinimized && !hasInitialized) {
      // Initialize with context-aware greeting when first opened
      const candidateName = selectedCandidate?.candidateName;
      const greeting = candidateName 
        ? `Hello! I'm your HR Copilot, here to help you analyze ${candidateName}'s profile.\n\nI have access to their complete resume, evaluation scores, and how they match against your job requirements. Feel free to ask me anything about their qualifications, experience, or evaluation results.\n\nWhat would you like to know?`
        : candidates.length > 0
          ? `Welcome! I'm your HR Copilot, ready to assist with your candidate evaluations.\n\nI can help you understand evaluation scores, compare candidates, and dive deep into their qualifications. Please select a candidate from the dropdown above to begin, or ask me general questions about the evaluation process.\n\nHow can I help you today?`
          : `Hello! I'm your HR Copilot.\n\nI'll be able to help you analyze candidate profiles once you've completed an evaluation. Please upload resumes and run an evaluation first, then return here for detailed insights.\n\nI'm standing by to assist once you have candidates to review.`;

      setMessages([{
        id: 'initial-greeting',
        text: greeting,
        sender: 'assistant',
        timestamp: new Date()
      }]);
      
      setHasInitialized(true);

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
  }, [isOpen, isMinimized, hasInitialized]);
  
  // Reset initialization when chat is closed
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
      setMessages([]);
    }
  }, [isOpen]);

  const handleSendMessage = async (messageText?: string) => {
    const queryText = messageText || input.trim();
    if (!queryText) return;
    
    // Prevent multiple simultaneous requests
    if (isLoading) return;

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
      // Debug logging only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Sending chat request with:', {
          query: queryText,
          candidateId: selectedCandidate?.candidateName,
          hasResumeText: !!selectedCandidate?.resumeText,
          resumeTextLength: selectedCandidate?.resumeText?.length
        });
      }

      const requestBody = {
        query: queryText,
        candidateId: selectedCandidate?.candidateName,
        resumeText: selectedCandidate?.resumeText,
        evaluationResult: selectedCandidate,
        jobDescription: jobDescription || jobInfo?.jobRequirements?.description,
        mustHaveAttributes: mustHaveAttributes || jobInfo?.jobRequirements?.mustHave?.join(', '),
      };
      
      // Log request details only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Sending request to /api/chat');
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }).catch(error => {
        console.error('Fetch error:', error);
        throw error;
      });

      // Log response status only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Response status:', response.status);
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json() as ChatResponse;
      // Log response details only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Chat response received:', {
          hasResponse: !!data.response,
          intent: data.intent,
          suggestionsCount: data.suggestions?.length
        });
      }
      
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
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMsg);
      
      // Log error details only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Chat error:', error);
        console.error('Chat error details:', {
          error,
          request: {
            query: queryText,
            candidateId: selectedCandidate?.candidateName,
            hasResumeText: !!selectedCandidate?.resumeText
          }
        });
      }
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        text: `Sorry, I encountered an error. Please try again later.`,
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
          isMinimized ? 'h-14' : 'h-[600px] w-[450px]'
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
              <div className="flex-grow p-4 space-y-4 overflow-y-auto" style={{ height: 'calc(100% - 200px)' }}>
                {messages.length === 0 && <p className="text-gray-400 text-sm text-center mt-8">No messages yet...</p>}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] ${
                        message.sender === 'user'
                          ? 'bg-rush-green text-white p-3 rounded-lg text-sm'
                          : 'bg-gray-50 text-gray-800 p-4 rounded-lg border border-gray-200'
                      }`}
                    >
                      {message.sender === 'user' ? (
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      ) : (
                        <MessageFormatter content={message.text} />
                      )}
                      {message.sender === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 flex items-center">
                            <InformationCircleIcon className="h-3 w-3 mr-1" />
                            Based on {message.sources.length} source{message.sources.length > 1 ? 's' : ''} from resume
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <p className="text-sm text-gray-600">Analyzing candidate information...</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && !isLoading && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-sm px-3 py-1.5 bg-white text-rush-green border border-rush-green/30 rounded-lg hover:bg-rush-green hover:text-white transition-all duration-200 hover:shadow-sm"
                      >
                        {suggestion}
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
              <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                <div className="flex items-end space-x-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedCandidate 
                      ? `Ask about ${selectedCandidate.candidateName}...`
                      : 'Ask me anything about the candidates or evaluation process...'
                    }
                    rows={1}
                    className="flex-grow p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rush-green focus:border-transparent outline-none resize-none transition-all duration-200"
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
                    className="p-3 bg-rush-green text-white rounded-lg hover:bg-rush-green-dark focus:outline-none focus:ring-2 focus:ring-rush-green/20 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[44px]"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <PaperAirplaneIcon className="h-5 w-5" />
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
