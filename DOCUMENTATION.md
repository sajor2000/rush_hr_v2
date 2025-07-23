# Technical Documentation

## Architecture Overview

This application is built with Next.js 14 App Router, TypeScript, and Tailwind CSS. It uses OpenAI's GPT models for AI-powered resume evaluation and chat functionality.

## Core Components

### 1. Resume Evaluation Pipeline

```
User Input → Job Description Analysis → Resume Parsing → AI Evaluation → Ranking → Results Display
```

- **Job Type Detection**: Uses GPT-4o-mini to categorize the job (Clinical, Research, Administrative, etc.)
- **Requirement Extraction**: Extracts must-have and preferred qualifications from job descriptions
- **Resume Preprocessing**: Optimizes resume text to reduce token usage by 20-30%
- **Parallel Processing**: Handles up to 15 concurrent resume parsing operations
- **Sequential Evaluation**: Processes evaluations sequentially to respect API rate limits

### 2. Scoring Algorithm

The evaluation uses a weighted scoring system:
```typescript
const weights = {
  technicalSkills: 0.40,        // 40% - Exact and semantic skill matching
  experienceRelevance: 0.30,    // 30% - Industry and role alignment
  educationCertifications: 0.15, // 15% - Degree relevance and certifications
  softSkillsCulture: 0.10,      // 10% - Leadership and teamwork evidence
  resumeQuality: 0.05           // 5%  - Structure and clarity
};
```

### 3. Ranking System

- **Not Qualified**: Score < 40 (missing must-have requirements)
- **Qualified Candidates**: Divided into quartiles
  - Q4 (Top 25%): "Top Tier"
  - Q3: "Highly Qualified"
  - Q2: "Qualified"
  - Q1 (Bottom 25%): "Qualified (Good Fit)"

### 4. Chat Architecture

The HR Copilot chat uses:
- **Intent Classification**: Identifies query type (resume details, evaluation challenge, etc.)
- **Context Injection**: Includes relevant resume and evaluation data
- **Evidence Extraction**: Searches resume text for supporting information
- **Suggestion Generation**: Provides contextual follow-up questions

## API Endpoints

### `/api/evaluate` (POST)
Processes resumes against job descriptions.
- **Input**: FormData with job description and resume files
- **Output**: Server-sent events stream with evaluation results
- **Rate Limit**: 50 requests/minute
- **Timeout**: 300 seconds
- **Max File Size**: 5MB per resume

### `/api/parse-job-description` (POST)
Extracts text from uploaded job description files.
- **Input**: FormData with file
- **Output**: Extracted text
- **Timeout**: 60 seconds

### `/api/chat` (POST)
Handles chat interactions with the HR Copilot.
- **Input**: Query, candidate context, job requirements
- **Output**: AI response with intent classification
- **Models**: GPT-4o-mini for intent, GPT-4o for responses

## State Management

The application uses React hooks for state management:
- **Evaluation Results**: Stored in component state with in-memory caching
- **Chat Context**: Passed through props, no persistent storage
- **File Uploads**: Handled via FormData API

## Error Handling

All API routes include comprehensive error handling:
```typescript
try {
  // Main logic
} catch (error) {
  logger.error('Operation failed', error);
  // Return appropriate HTTP status and error message
}
```

## Performance Optimizations

1. **Token Optimization**: Resume preprocessing reduces tokens by 20-30%
2. **Caching**: SHA-256 hash-based caching for duplicate resumes
3. **Streaming**: Server-sent events for real-time progress updates
4. **Concurrent Limits**: Balanced for optimal throughput without overwhelming APIs

## Security Measures

- Input sanitization for chat messages
- File size validation (5MB limit)
- Rate limiting (50 req/min)
- CORS headers for cross-origin support
- No hardcoded secrets
- Environment variable validation

## Logging System

Custom logger provides structured logging:
```typescript
logger.info('API Request', { method, path, context });
logger.error('Operation failed', error, { context });
```

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile responsive design

## Development Tools

- **Type Checking**: `npx tsc --noEmit`
- **Linting**: `npm run lint`
- **Building**: `npm run build`
- **Development**: `npm run dev`

## Deployment Considerations

1. **Environment Variables**: Only `OPENAI_API_KEY` required
2. **Vercel Settings**: Configured in `vercel.json`
3. **Root Directory**: All files must be in root (not subdirectories)
4. **Build Output**: Approximately 365KB first load JS

## Future Enhancements

Potential improvements identified:
- Semantic search for evidence extraction
- Persistent chat history
- Advanced caching strategies
- Real-time collaboration features
- Integration with ATS systems