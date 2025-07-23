# HR Assistant Pro - Chat Feature Documentation

## Overview

The HR Assistant Pro Chat Feature is a sophisticated AI-powered copilot designed to help HR professionals analyze candidate resumes with intelligent, context-aware responses. Built using the RISEN prompt methodology, it provides evidence-based insights and transparent analysis.

## Features

### 🤖 Intelligent Chat Assistant
- **Context-Aware Responses**: Understands candidate-specific context and job requirements
- **Intent Classification**: Automatically categorizes user queries for optimal response generation
- **Evidence-Based Answers**: Quotes directly from resumes and evaluation data
- **Multi-Candidate Support**: Switch between candidates seamlessly during conversations

### 🔒 Enterprise-Grade Security
- **Rate Limiting**: 20 requests per minute per IP address
- **Input Sanitization**: Prevents XSS and injection attacks
- **Environment Validation**: Ensures proper API key configuration
- **Error Handling**: Graceful degradation with informative error messages

### 🎯 RISEN Methodology Implementation
- **R**ole: Professional HR Copilot
- **I**nputs: Resume text, evaluation results, job descriptions, must-have attributes
- **S**teps: Intent classification → Evidence retrieval → Response generation
- **E**xpectations: Accurate, transparent, evidence-based responses
- **N**ote: Never speculates without basis

## Architecture

### Core Components

#### 1. Chat Service (`/src/lib/chatService.ts`)
- **Intent Classification**: Categorizes user queries into 6 main types
- **Evidence Search**: Semantic search through resume content
- **Response Generation**: OpenAI GPT-4 integration with RISEN prompt
- **Environment Validation**: Ensures proper API configuration

#### 2. Chat API Route (`/src/app/api/chat/route.ts`)
- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Structured error responses with appropriate HTTP status codes
- **Security**: Input sanitization and IP-based rate limiting

#### 3. Chat UI Component (`/src/components/ChatAssistant.tsx`)
- **Candidate Selection**: Dropdown to switch between evaluated candidates
- **Message History**: Persistent chat history with timestamps
- **Suggestions**: Context-aware question suggestions
- **Real-time Feedback**: Loading states, error handling, and source attribution

#### 4. Type Definitions (`/src/types/chat.ts`)
- **Comprehensive Types**: Full TypeScript support for all chat interfaces
- **Intent System**: Structured intent classification with confidence scores
- **Message Structure**: Rich message objects with metadata

## Intent Categories

1. **Resume Detail Inquiry**: "Did they mention AWS?"
2. **Evaluation Challenge**: "Why weren't they qualified?"
3. **Candidate Comparison**: "Who's stronger in research?"
4. **Skill Verification**: "Where do they show leadership?"
5. **Experience Analysis**: "How many years of experience?"
6. **Ambiguity Check**: "Is that gap justified?"

## Setup Instructions

### 1. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env.local

# Add your OpenAI API key
OPENAI_API_KEY="sk-your-api-key-here"
```

### 2. Dependencies
All required dependencies are already installed:
- `openai`: OpenAI API client
- `next`: Next.js framework
- `react`: React library
- `typescript`: TypeScript support

### 3. Development Server
```bash
npm run dev
```

The chat feature will be available at `http://localhost:3000` (or 3001 if 3000 is in use).

## Usage Guide

### Basic Usage
1. **Complete an Evaluation**: Upload resumes and run the evaluation process
2. **Select a Candidate**: Use the dropdown in the chat interface to select a specific candidate
3. **Ask Questions**: Type questions about the candidate or evaluation process
4. **Review Responses**: Each response includes intent classification and source attribution

### Example Queries
- "What programming languages does John mention?"
- "Why was Sarah ranked in Tier 2?"
- "Where does Mike show leadership experience?"
- "Compare the technical skills of the top candidates"
- "What gaps were identified in the evaluation?"

### Advanced Features
- **Suggestions**: Click on suggested questions for quick interactions
- **Source Attribution**: Expand source details to see evidence from resumes
- **Error Recovery**: Automatic retry suggestions for failed requests
- **Context Switching**: Seamlessly switch between candidates mid-conversation

## API Reference

### POST `/api/chat`

#### Request Body
```typescript
{
  query: string;                    // User's question (required)
  candidateId?: string;            // Selected candidate name
  resumeText?: string;             // Raw resume text
  evaluationResult?: EvaluationResult; // Evaluation metadata
  jobDescription?: string;         // Job description
  mustHaveAttributes?: string;     // Must-have requirements
}
```

#### Response
```typescript
{
  response: string;                // AI-generated response
  intent: ChatIntent;             // Classified intent
  confidence: number;             // Intent confidence (0-1)
  sources: string[];              // Evidence sources
  suggestions?: string[];         // Follow-up suggestions
  error?: string;                 // Error message if applicable
}
```

#### Error Responses
- `400`: Invalid request (missing/invalid query)
- `401`: Authentication failed (invalid API key)
- `429`: Rate limit exceeded
- `500`: Internal server error

## Performance Considerations

### Rate Limiting
- **Limit**: 20 requests per minute per IP
- **Window**: 60 seconds
- **Cleanup**: Automatic cleanup every 5 minutes

### Response Times
- **Average**: 2-4 seconds for typical queries
- **Complex Queries**: 5-8 seconds for multi-candidate comparisons
- **Timeout**: 30 seconds maximum

### Optimization Tips
- Use specific questions for faster responses
- Leverage suggestions for common queries
- Switch candidates efficiently using the dropdown

## Security Features

### Input Validation
- Query length limits (1000 characters)
- HTML tag removal
- JavaScript protocol filtering
- Type validation for all inputs

### Rate Limiting
- IP-based tracking
- Configurable limits
- Graceful degradation
- Retry-After headers

### Error Handling
- No sensitive data in error messages
- Development vs production error details
- Structured error responses
- Logging for debugging

## Troubleshooting

### Common Issues

#### "Chat service is not properly configured"
- **Cause**: Missing or invalid OPENAI_API_KEY
- **Solution**: Check your `.env.local` file and ensure the API key starts with `sk-`

#### "Rate limit exceeded"
- **Cause**: Too many requests from the same IP
- **Solution**: Wait for the rate limit window to reset (shown in error message)

#### "An unexpected error occurred"
- **Cause**: Various server-side issues
- **Solution**: Check server logs and ensure OpenAI API is accessible

### Debug Mode
Set `NODE_ENV=development` to see detailed error messages in API responses.

## Future Enhancements

### Planned Features
- **Streaming Responses**: Real-time response generation
- **Chat History Persistence**: Save conversations across sessions
- **Advanced Search**: Vector embeddings for better semantic search
- **Export Functionality**: Save chat transcripts
- **Multi-language Support**: Support for non-English resumes

### Performance Improvements
- **Caching**: Response caching for common queries
- **Batch Processing**: Efficient multi-candidate analysis
- **Compression**: Response compression for faster delivery

## Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Add comprehensive error handling
3. Include unit tests for new features
4. Update documentation for API changes
5. Test with various resume formats

### Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests (when available)
npm run test
```

## Support

For technical support or feature requests, please refer to the main project documentation or contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: June 2025  
**Compatibility**: Next.js 14+, React 18+, TypeScript 5+
