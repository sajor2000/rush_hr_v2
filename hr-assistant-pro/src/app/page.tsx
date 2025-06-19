'use client';

import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ResumeDropzone from '@/components/ResumeDropzone';
import { JobType, EvaluationResult, EnhancedJobRequirements } from '@/types';
import EvaluationResultCard from '@/components/EvaluationResultCard';
import AdaptiveResults from '@/components/AdaptiveResults';
import ResultsDashboard from '@/components/ResultsDashboard';
import JobDescriptionUploader from '@/components/JobDescriptionUploader';
import ApiKeyTester from '@/components/ApiKeyTester';
import ProcessGuide from '@/components/ProcessGuide';

interface JobInfo {
  jobType: JobType;
  jobRequirements: EnhancedJobRequirements;
}

export default function Home() {
  const [jobDescription, setJobDescription] = useState('');
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [mustHaveAttributes, setMustHaveAttributes] = useState('');
  
  // State for streaming results
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [evaluationErrors, setEvaluationErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Function to calculate and apply quartile rankings
  const applyQuartileRanking = (results: EvaluationResult[]): EvaluationResult[] => {
    const qualifiedCandidates = results.filter(r => r.mustHavesMet === true);

    if (qualifiedCandidates.length === 0) {
      return results; // No qualified candidates to rank
    }

    // Sort qualified candidates by overall score, descending
    qualifiedCandidates.sort((a, b) => b.scores.overall - a.scores.overall);

    const totalQualified = qualifiedCandidates.length;
    const q1End = Math.ceil(totalQualified * 0.25);
    const q2End = Math.ceil(totalQualified * 0.50);
    const q3End = Math.ceil(totalQualified * 0.75);

    const rankedResults = qualifiedCandidates.map((candidate, index) => {
      const rank = index + 1;
      let quartileTier = '';
      if (rank <= q1End) quartileTier = 'Top Qualified (Q1)';
      else if (rank <= q2End) quartileTier = 'Highly Qualified (Q2)';
      else if (rank <= q3End) quartileTier = 'Qualified (Q3)';
      else quartileTier = 'Considerable (Q4)';
      
      return {
        ...candidate,
        quartileRank: rank,
        quartileTier,
        totalQualifiedForQuartile: totalQualified,
      };
    });

    // Merge ranked results back into the original list, preserving original order for non-qualified
    // or provide a completely new list if only showing qualified ones with quartiles.
    // For now, let's update the original results array for those who qualified.
    return results.map(originalResult => {
      const rankedVersion = rankedResults.find(rr => rr.candidateName === originalResult.candidateName); // Assuming candidateName is unique
      return rankedVersion || originalResult;
    });
  };

  useEffect(() => {
    if (!isEvaluating && evaluationResults.length > 0 && !fatalError) {
      // Check if quartile ranking has already been applied to prevent infinite loops
      const alreadyRanked = evaluationResults.some(r => r.quartileTier !== undefined);
      if (!alreadyRanked) {
        const resultsWithQuartiles = applyQuartileRanking([...evaluationResults]); // Use a copy
        setEvaluationResults(resultsWithQuartiles);
      }
    }
  }, [isEvaluating, evaluationResults, fatalError]);

  const handleJobDescriptionUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('jobDescriptionFile', file);

    try {
      const response = await fetch('/api/parse-job-description', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse file.');
      }

      const { extractedText } = await response.json();
      setJobDescription(extractedText);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setFatalError(`Error processing job description: ${errorMessage}`);
      console.error('Job description parsing failed:', error);
    }
  };

  const handleEvaluate = async () => {
    if (!jobDescription.trim() || files.length === 0) return;

    setIsEvaluating(true);
    setJobInfo(null);
    setEvaluationResults([]);
    setEvaluationErrors({});
    setProgress(0);
    setFatalError(null);
    setStatusMessage('Initializing evaluation...');

    const formData = new FormData();
    formData.append('jobDescription', jobDescription);
    formData.append('mustHaveAttributes', mustHaveAttributes);
    files.forEach(file => formData.append('resumes', file));

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
        throw new Error(errorData.error);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last, possibly incomplete line

        for (const line of lines) {
          if (!line.startsWith('data:') && !line.startsWith('event:')) continue;

          const eventMatch = line.match(/^event: (.*)$/m);
          const dataMatch = line.match(/^data: (.*)$/m);

          const event = eventMatch ? eventMatch[1] : 'message';
          const data = dataMatch ? JSON.parse(dataMatch[1]) : {};

          switch (event) {
            case 'status_update':
              setStatusMessage(data.message);
              break;
            case 'job_info':
              setJobInfo(data);
              break;
            case 'evaluation_result':
              setEvaluationResults(prev => [...prev, data]);
              setProgress(p => p + 1);
              break;
            case 'evaluation_error':
              setEvaluationErrors(prev => ({ ...prev, [data.candidateId]: data.error }));
              setProgress(p => p + 1);
              break;
            case 'error':
              setFatalError(data.error);
              break;
            case 'done':
              reader.cancel();
              break;
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred.';
      setFatalError(errorMessage);
      console.error('Evaluation failed:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleExportCSV = () => {
    if (evaluationResults.length === 0 || !jobInfo) return;

    const dataToExport = evaluationResults.map(result => ({
      'Candidate Name': result.candidateName,
      'Overall Score (%)': result.scores.overall,
      'Tier': result.tier,
      'Must-Haves Met': result.mustHavesMet ? 'Yes' : 'No',
      'Strengths': result.strengths.join('; '),
      'Weaknesses': result.gaps.join('; '),
      'Professionalism Score (%)': result.scores.professionalism,
      'AI Justification': result.explanation,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `evaluation-results-${jobInfo.jobRequirements.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (evaluationResults.length === 0 || !jobInfo) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let yPos = 20;

    // --- Report Header ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 78, 37); // RUSH Green #004E25
    doc.text('Candidate Evaluation Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Job Title: ${jobInfo.jobRequirements.title}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // --- Report Body ---
    evaluationResults.forEach((result, index) => {
      if (yPos > pageHeight - 60) { // Margin for footer
        doc.addPage();
        yPos = 20;
      }

      // Candidate Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 78, 37); // RUSH Green #004E25
      doc.text(`${index + 1}. ${result.candidateName}`, 14, yPos);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Tier: ${result.tier}  |  Overall Score: ${result.scores.overall}%`, 14, yPos + 7);
      yPos += 15;

      doc.setFont('helvetica', 'bold');
      doc.text('Must-Haves Met:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(result.mustHavesMet ? 'Yes' : 'No', 55, yPos);
      yPos += 8;

      const renderBulletedList = (title: string, items: string[]) => {
        if (items.length === 0) return;
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        items.forEach(item => {
          const splitItem = doc.splitTextToSize(`- ${item}`, pageWidth - 35);
          doc.text(splitItem, 20, yPos);
          yPos += (splitItem.length * 5);
        });
        yPos += 4;
      };

      renderBulletedList('Strengths:', result.strengths);
      renderBulletedList('Weaknesses:', result.gaps);

      doc.setFont('helvetica', 'bold');
      doc.text('AI Justification:', 14, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const explanation = doc.splitTextToSize(result.explanation, pageWidth - 28);
      doc.text(explanation, 14, yPos);
      yPos += (explanation.length * 5) + 15;

      if (index < evaluationResults.length - 1) {
        doc.setDrawColor(221, 221, 221);
        doc.line(14, yPos - 8, pageWidth - 14, yPos - 8);
      }
    });

    // --- Report Footer ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }

    doc.save(`evaluation-report-${jobInfo.jobRequirements.title.replace(/\s+/g, '_')}.pdf`);
  };

  const progressPercentage = files.length > 0 ? (progress / files.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-neutral-gray-lightest">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-rush-green-DEFAULT">HR Assistant Pro</h1>
          <p className="text-rush-charcoal-DEFAULT mt-1">Streamline Your Hiring with AI-Powered Resume Evaluation</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-8 space-y-10">
        <ProcessGuide />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-rush-green-DEFAULT mb-4">1. Job Description</h2>
              <JobDescriptionUploader
                onFileAccepted={handleJobDescriptionUpload}
                file={jobDescriptionFile}
                setFile={setJobDescriptionFile}
                disabled={isEvaluating}
              />
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Or paste the job description here..."
                className="w-full h-32 p-3 mt-4 border border-neutral-gray rounded-lg focus:ring-2 focus:ring-rush-green-DEFAULT focus:border-rush-green-DEFAULT transition"
                disabled={isEvaluating}
              />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-rush-green-DEFAULT mb-4">2. Key Must-Have Attributes (Optional)</h2>
              <label htmlFor="mustHaveAttributes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Please, in this box, type in the must-have qualifications for the job description uploaded from your point of view as an HR professional.
              </label>
              <textarea
                id="mustHaveAttributes"
                value={mustHaveAttributes}
                onChange={(e) => setMustHaveAttributes(e.target.value)}
                placeholder="e.g., 'Must have 5+ years of experience with Node.js AND a PMP certification.'"
                rows={4}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-rush-green focus:border-rush-green dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition"
                disabled={isEvaluating}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Please type in easy to understand plain text. These attributes will be critically evaluated.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold text-rush-green-DEFAULT mb-4">3. Upload Resumes</h2>
              <ResumeDropzone files={files} setFiles={setFiles} disabled={isEvaluating} />
            </div>
            <ApiKeyTester />
            <button
              onClick={handleEvaluate}
              disabled={!jobDescription || files.length === 0 || isEvaluating}
              className="w-full py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-semibold text-white bg-rush-green-DEFAULT hover:bg-rush-green-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rush-green-DEFAULT transition-transform transform hover:scale-105 disabled:bg-neutral-gray disabled:cursor-not-allowed disabled:transform-none"
            >
              {isEvaluating ? 'Evaluating...' : 'Evaluate Resumes'}
            </button>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-xl shadow-lg min-h-[40rem]">
              <h2 className="text-2xl font-bold text-rush-green-DEFAULT mb-6">Evaluation Results</h2>
              {isEvaluating && (
                <div className="space-y-4 text-center">
                  <p className="text-lg font-semibold text-rush-green-DEFAULT">{statusMessage || 'Preparing evaluation...'}</p>
                  <div className="w-full bg-neutral-gray-light rounded-full h-4">
                    <div
                      className="bg-rush-green-DEFAULT h-4 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-neutral-gray-dark">({progress} of {files.length} resumes processed)</p>
                  {jobInfo && <p className="text-sm text-neutral-gray-dark">Detected Job Type: <span className="font-semibold">{jobInfo.jobType}</span></p>}
                </div>
              )}

              {!isEvaluating && evaluationResults.length === 0 && Object.keys(evaluationErrors).length === 0 && (
                <div className="text-center py-20">
                  <p className="text-xl text-neutral-gray">Results will appear here once the evaluation is complete.</p>
                </div>
              )}

              <div className="mt-6">
                {evaluationResults.length > 0 && (
                  <div className="space-y-8">
                    <div className="flex justify-end space-x-4">
                      <button 
                        onClick={handleExportCSV} 
                        disabled={evaluationResults.length === 0}
                        className="px-5 py-2 border border-rush-green-DEFAULT text-sm font-medium rounded-lg text-rush-green-DEFAULT hover:bg-rush-green-light transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Export to CSV
                      </button>
                      <button 
                        onClick={handleExportPDF} 
                        disabled={evaluationResults.length === 0}
                        className="px-5 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-rush-green-DEFAULT hover:bg-rush-green-dark transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Export to PDF
                      </button>
                    </div>
                    {/* <AdaptiveResults results={evaluationResults} /> */}
                    {/* ResultsDashboard will now receive results potentially enriched with quartile data */}
                    {jobInfo && jobInfo.jobRequirements && (
                        <ResultsDashboard results={evaluationResults} jobRequirements={jobInfo.jobRequirements} />
                    )}
                    {/* Temporarily render raw quartile data for verification */}
                    {evaluationResults.some(r => r.quartileTier) && (
                      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                        <h3 className="text-lg font-semibold">Quartile Ranking Details (Debug):</h3>
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(evaluationResults.filter(r => r.quartileTier).map(r => ({ name: r.candidateName, score: r.scores.overall, tier: r.tier, mustHavesMet: r.mustHavesMet, quartile: r.quartileTier, rank: r.quartileRank, totalQ: r.totalQualifiedForQuartile })), null, 2)}
                        </pre>
                      </div>
                    )}

                  </div>
                )}

                {Object.keys(evaluationErrors).length > 0 && (
                  <div className="mt-8">
                    <h4 className="font-semibold text-red-600 text-lg">Evaluation Errors</h4>
                    <div className="mt-4 space-y-3">
                      {Object.entries(evaluationErrors).map(([id, error]) => (
                          <div key={id} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                            <p className="font-bold text-red-800">Failed: {id}</p>
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
