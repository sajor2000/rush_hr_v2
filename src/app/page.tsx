'use client';

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ResumeDropzone from '@/components/ResumeDropzone';
import { JobType, EvaluationResult, EnhancedJobRequirements } from '@/types';

import ResultsDashboard from '@/components/ResultsDashboard';
import JobDescriptionUploader from '@/components/JobDescriptionUploader';
import FloatingChatWidget from '@/components/FloatingChatWidget';
import ProcessGuide from '@/components/ProcessGuide';
import ErrorBoundary from '@/components/ErrorBoundary';
import EnhancedHeader from '@/components/EnhancedHeader';
import EnhancedLoading from '@/components/EnhancedLoading';
import EnhancedResultsVisualization from '@/components/EnhancedResultsVisualization';
import ApiKeyTester from '@/components/ApiKeyTester';

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
  const [selectedChatCandidate, setSelectedChatCandidate] = useState<string>('');

  // State for streaming results
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [evaluationErrors, setEvaluationErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Function to calculate and apply quartile rankings
  const applyQuartileRanking = (results: EvaluationResult[]): EvaluationResult[] => {
    // Apply quartiles to ALL candidates, not just qualified ones
    if (results.length === 0) {
      return results;
    }

    // Sort ALL candidates by overall score, descending
    const sortedCandidates = [...results].sort((a, b) => b.scores.overall - a.scores.overall);

    const totalCandidates = sortedCandidates.length;
    const q1End = Math.ceil(totalCandidates * 0.25);
    const q2End = Math.ceil(totalCandidates * 0.50);
    const q3End = Math.ceil(totalCandidates * 0.75);

    const rankedResults = sortedCandidates.map((candidate, index) => {
      const rank = index + 1;
      let quartileTier = '';
      if (rank <= q1End) quartileTier = 'Q1 - Top 25%';
      else if (rank <= q2End) quartileTier = 'Q2 - Top 50%';
      else if (rank <= q3End) quartileTier = 'Q3 - Top 75%';
      else quartileTier = 'Q4 - Bottom 25%';
      
      return {
        ...candidate,
        quartileRank: rank,
        quartileTier,
        totalQualifiedForQuartile: totalCandidates,
      };
    });

    // Return the ranked results directly since we're ranking ALL candidates now
    return rankedResults;
  };

  // Apply quartile ranking when evaluation completes
  useEffect(() => {
    if (!isEvaluating && evaluationResults.length > 0 && !fatalError) {
      // Check if quartile ranking has already been applied to prevent infinite loops
      const alreadyRanked = evaluationResults.some(r => r.quartileTier !== undefined);
      if (!alreadyRanked) {
        // Use setTimeout to break the synchronous update cycle
        const timeoutId = setTimeout(() => {
          const resultsWithQuartiles = applyQuartileRanking([...evaluationResults]);
          setEvaluationResults(resultsWithQuartiles);
        }, 0);
        
        // Cleanup timeout on unmount or dependency change
        return () => clearTimeout(timeoutId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEvaluating, fatalError]); // evaluationResults intentionally omitted to prevent infinite loops

  const handleJobDescriptionUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('jobDescriptionFile', file);

    try {
      // Log the file being uploaded
      if (process.env.NODE_ENV === 'development') {
        console.log('Uploading job description:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
      }

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
      
      // Log success
      if (process.env.NODE_ENV === 'development') {
        console.log('Job description parsed successfully, length:', extractedText.length);
      }

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

    let abortController: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Create abort controller for timeout protection
      abortController = new AbortController();
      
      // Set a reasonable timeout (10 minutes for large batches)
      timeoutId = setTimeout(() => {
        abortController?.abort();
      }, 10 * 60 * 1000);

      const response = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
        throw new Error(errorData.error);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let lastActivity = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lastActivity = Date.now();
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
            case 'progress_update':
              if (data.progress !== undefined) {
                setProgress(data.progress);
              }
              if (data.message) {
                setStatusMessage(data.message);
              }
              // Log progress for debugging
              if (process.env.NODE_ENV === 'development') {
                console.log('Progress update:', data);
              }
              break;
            case 'error':
              setFatalError(data.error);
              break;
            case 'done':
              reader.cancel();
              break;
          }
        }

        // Check for inactivity timeout (30 seconds without activity)
        if (Date.now() - lastActivity > 30000) {
          throw new Error('Processing timeout - no activity for 30 seconds');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setFatalError('Processing timeout - the evaluation took too long to complete');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred.';
        setFatalError(errorMessage);
      }
      console.error('Evaluation failed:', error);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsEvaluating(false);
    }
  };

  const handleExportCSV = () => {
    if (evaluationResults.length === 0 || !jobInfo) return;

    // Sort results by score (highest first) before export
    const sortedResults = [...evaluationResults].sort((a, b) => b.scores.overall - a.scores.overall);

    const dataToExport = sortedResults.map(result => ({
      'Candidate Name': result.candidateName,
      'Overall Score (%)': result.scores.overall,
      'Tier': result.tier,
      'Quartile': result.quartileTier || 'N/A',
      'Rank': result.quartileRank || 'N/A',
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

    // Sort results by score (highest first) and group by quartile
    const sortedResults = [...evaluationResults].sort((a, b) => b.scores.overall - a.scores.overall);
    
    // Group by quartile
    const quartileGroups: Record<string, typeof sortedResults> = {
      'Q1 - Top 25%': [],
      'Q2 - Top 50%': [],
      'Q3 - Top 75%': [],
      'Q4 - Bottom 25%': [],
      'Not Qualified': []
    };
    
    sortedResults.forEach(result => {
      const group = result.quartileTier || 'Not Qualified';
      if (quartileGroups[group]) {
        quartileGroups[group].push(result);
      } else {
        quartileGroups['Not Qualified'].push(result);
      }
    });

    // --- Report Body ---
    let globalIndex = 0;
    Object.entries(quartileGroups).forEach(([quartile, candidates]) => {
      if (candidates.length === 0) return;
      
      // Add quartile header
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 78, 37);
      doc.text(quartile, 14, yPos);
      yPos += 10;
      
      candidates.forEach((result) => {
        globalIndex++;
      if (yPos > pageHeight - 60) { // Margin for footer
        doc.addPage();
        yPos = 20;
      }

      // Candidate Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 78, 37); // RUSH Green #004E25
      doc.text(`${globalIndex}. ${result.candidateName}`, 14, yPos);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const quartileInfo = result.quartileTier ? ` | ${result.quartileTier}` : '';
      doc.text(`Tier: ${result.tier}  |  Overall Score: ${result.scores.overall}%${quartileInfo}`, 14, yPos + 7);
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

      // Add separator line between candidates within same quartile
      if (candidates.indexOf(result) < candidates.length - 1) {
        doc.setDrawColor(221, 221, 221);
        doc.line(14, yPos - 8, pageWidth - 14, yPos - 8);
      }
      });
    });

    // --- Report Footer ---
    const pageCount = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
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
      <EnhancedHeader />
      <main className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-8 space-y-10">
        <ErrorBoundary
          fallback={
            <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
              <h2 className="text-lg font-semibold text-red-800">Application Error</h2>
              <p className="text-red-600 mt-2">
                The application encountered an error. Please refresh the page to try again.
              </p>
            </div>
          }
        >
          <ProcessGuide />
        </ErrorBoundary>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-1 space-y-8">
            <div className="card p-6 card-hover">
              <h2 className="text-xl font-semibold text-rush-green mb-4">1. Job Description</h2>
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
                className="input-field h-32 mt-4 resize-none"
                disabled={isEvaluating}
              />
            </div>
            <div className="card p-6 card-hover">
              <h2 className="text-xl font-semibold text-rush-green mb-4">2. Key Must-Have Attributes (Optional)</h2>
              <label htmlFor="mustHaveAttributes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Please, in this box, type in the must-have qualifications for the job description uploaded from your point of view as an HR professional.
              </label>
              <textarea
                id="mustHaveAttributes"
                value={mustHaveAttributes}
                onChange={(e) => setMustHaveAttributes(e.target.value)}
                placeholder="e.g., 'Must have 5+ years of experience with Node.js AND a PMP certification.'"
                rows={4}
                className="input-field resize-none"
                disabled={isEvaluating}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Please type in easy to understand plain text. These attributes will be critically evaluated.
              </p>
            </div>
            <div className="card p-6 card-hover">
              <h2 className="text-xl font-semibold text-rush-green mb-4">3. Upload Resumes</h2>
              <ResumeDropzone files={files} setFiles={setFiles} disabled={isEvaluating} />
            </div>
            <ApiKeyTester />
            <button
              onClick={handleEvaluate}
              disabled={!jobDescription || files.length === 0 || isEvaluating}
              className="btn-primary w-full text-lg"
            >
              {isEvaluating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="loading-dots text-white">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                  <span>Evaluating...</span>
                </div>
              ) : (
                'Evaluate Resumes'
              )}
            </button>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2">
            <div className="card p-8 min-h-[40rem] flex flex-col">
              {/* Existing Results Section (empty div removed) */}
              <h2 className="text-2xl font-bold text-rush-green mb-6">Evaluation Results</h2>
              <div className="flex-grow overflow-y-auto"> {/* Wrapper for scrollable/growing content */}
              {isEvaluating && (
                <div className="space-y-6 text-center">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="loading-dots text-rush-green">
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <p className="text-lg font-semibold text-rush-green">{statusMessage || 'Preparing evaluation...'}</p>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-gray-dark">({progress} of {files.length} resumes processed)</p>
                    {jobInfo && (
                      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rush-green/10 text-rush-green rounded-full text-sm">
                        <span>Detected Job Type:</span>
                        <span className="font-semibold">{jobInfo.jobType}</span>
                      </div>
                    )}
                  </div>
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
                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                      <button 
                        onClick={handleExportCSV} 
                        disabled={evaluationResults.length === 0}
                        className="btn-secondary text-sm"
                      >
                        Export to CSV
                      </button>
                      <button 
                        onClick={handleExportPDF} 
                        disabled={evaluationResults.length === 0}
                        className="btn-primary text-sm"
                      >
                        Export to PDF
                      </button>
                    </div>
                    {/* Enhanced Results Visualization */}
                    <EnhancedResultsVisualization results={evaluationResults} jobRequirements={jobInfo?.jobRequirements} />
                    
                    {/* Detailed Results Table */}
                    {jobInfo && jobInfo.jobRequirements && (
                        <ResultsDashboard results={evaluationResults} jobRequirements={jobInfo.jobRequirements} />
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
              </div> {/* This closes the mt-6 div that groups results and errors */}
            </div> {/* This closes the flex-grow overflow-y-auto div */}
          </div> {/* This closes the results card itself (bg-white p-8...) */}
        </div> {/* This closes the right column div */}
      </div> {/* This closes the grid container */}
      </main>
      
      {/* Enhanced Loading Overlay */}
      <EnhancedLoading
        isVisible={isEvaluating}
        progress={progressPercentage}
        statusMessage={statusMessage}
        onCancel={() => setIsEvaluating(false)}
      />

      {/* Floating Chat Widget */}
      <ErrorBoundary>
        <FloatingChatWidget 
          candidates={evaluationResults}
          selectedCandidateId={selectedChatCandidate}
          onCandidateSelect={setSelectedChatCandidate}
          jobDescription={jobDescription}
          mustHaveAttributes={mustHaveAttributes}
          jobInfo={jobInfo}
        />
      </ErrorBoundary>
    </div>
  );
}
