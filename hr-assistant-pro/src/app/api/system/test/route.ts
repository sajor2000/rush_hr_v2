import { NextRequest, NextResponse } from 'next/server';
import { evaluateCandidate } from '@/lib/candidateEvaluator';
import { ChatService } from '@/lib/chatService';
import { detectJobType } from '@/lib/jobTypeDetector';
import { extractJobRequirements } from '@/lib/requirementExtractor';

// Test data
const TEST_RESUME = `
John Smith
Senior Software Engineer
john.smith@email.com | (555) 123-4567

SUMMARY
Experienced software engineer with 8+ years developing scalable web applications using 
React, Node.js, and cloud technologies. Strong background in agile methodologies and 
team leadership.

EXPERIENCE
Senior Software Engineer - Tech Corp (2020-Present)
- Led team of 5 developers building microservices architecture
- Implemented CI/CD pipelines reducing deployment time by 60%
- Mentored junior developers and conducted code reviews

Software Engineer - StartupXYZ (2016-2020)
- Developed React-based front-end serving 1M+ users
- Optimized database queries improving performance by 40%
- Collaborated with product team on feature planning

EDUCATION
Bachelor of Science in Computer Science
University of Technology (2016)

SKILLS
Languages: JavaScript, TypeScript, Python, Java
Frameworks: React, Node.js, Express, Django
Cloud: AWS, Azure, Docker, Kubernetes
Databases: PostgreSQL, MongoDB, Redis
`;

const TEST_JOB_DESCRIPTION = `
Senior Software Engineer

We are seeking an experienced Senior Software Engineer to join our growing team.

Must-Have Requirements:
- Bachelor's degree in Computer Science or related field
- 5+ years of software development experience
- Strong experience with React and Node.js
- Experience with cloud platforms (AWS or Azure)

Nice-to-Have:
- Experience with microservices architecture
- Leadership or mentoring experience
- Knowledge of CI/CD practices
- Experience with containerization (Docker/Kubernetes)

Responsibilities:
- Design and develop scalable web applications
- Mentor junior team members
- Participate in architecture decisions
- Collaborate with cross-functional teams
`;

interface TestResult {
  test: string;
  status: 'passed' | 'failed';
  duration: number;
  details?: any;
  error?: string;
}

async function runTest(
  testName: string,
  testFn: () => Promise<any>
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    return {
      test: testName,
      status: 'passed',
      duration: Date.now() - startTime,
      details: result
    };
  } catch (error) {
    return {
      test: testName,
      status: 'failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(req: NextRequest) {
  const results: TestResult[] = [];
  
  // Test 1: Job Type Detection
  results.push(await runTest('Job Type Detection', async () => {
    const jobType = await detectJobType(TEST_JOB_DESCRIPTION);
    if (jobType !== 'technical') {
      throw new Error(`Expected 'technical', got '${jobType}'`);
    }
    return { detectedType: jobType };
  }));
  
  // Test 2: Requirement Extraction
  results.push(await runTest('Requirement Extraction', async () => {
    const requirements = await extractJobRequirements(TEST_JOB_DESCRIPTION, 'technical');
    if (!requirements.mustHave || requirements.mustHave.length === 0) {
      throw new Error('Failed to extract must-have requirements');
    }
    return {
      mustHaveCount: requirements.mustHave.length,
      niceToHaveCount: requirements.niceToHave?.length || 0
    };
  }));
  
  // Test 3: Resume Evaluation
  results.push(await runTest('Resume Evaluation', async () => {
    const requirements = await extractJobRequirements(TEST_JOB_DESCRIPTION, 'technical');
    const evaluation = await evaluateCandidate(TEST_RESUME, 'test-resume.pdf', requirements);
    
    if (!evaluation.scores || typeof evaluation.scores.overall !== 'number') {
      throw new Error('Invalid evaluation result');
    }
    
    return {
      overallScore: evaluation.scores.overall,
      tier: evaluation.tier,
      mustHavesMet: evaluation.mustHavesMet
    };
  }));
  
  // Test 4: Chat Service
  results.push(await runTest('Chat Service', async () => {
    const intent = await ChatService.classifyIntent('What experience does the candidate have?');
    const evidence = await ChatService.searchResume(TEST_RESUME, 'experience');
    
    const response = await ChatService.generateResponse(
      'What is the candidate\'s experience?',
      {
        candidateName: 'John Smith',
        resumeText: TEST_RESUME,
        evaluationResult: {
          candidateId: 'test',
          candidateName: 'John Smith',
          scores: { overall: 85, preferredQualifications: 90, professionalism: 70 },
          tier: 'Qualified' as const,
          strengths: ['Strong technical background'],
          gaps: [],
          explanation: 'Well-qualified candidate',
          mustHavesMet: true,
          preferredQualifications: []
        }
      },
      intent,
      evidence
    );
    
    if (!response || response.length < 10) {
      throw new Error('Chat response too short or empty');
    }
    
    return {
      intent: intent.intent,
      evidenceCount: evidence.length,
      responseLength: response.length
    };
  }));
  
  // Calculate summary
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  return NextResponse.json({
    summary: {
      total: results.length,
      passed,
      failed,
      success: failed === 0,
      totalDuration
    },
    results,
    configuration: {
      usingAzure: process.env.USE_AZURE_OPENAI === 'true',
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'Not set',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'Not set'
    }
  });
}