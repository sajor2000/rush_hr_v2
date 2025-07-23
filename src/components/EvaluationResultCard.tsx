import { EvaluationResult } from '@/types';
import React from 'react';

interface Props {
  result: EvaluationResult;
}

const tierColorMap: Record<string, { bg: string; text: string; border: string }> = {
  top: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
  qualified: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
  potential: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
  notQualified: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
};

const EvaluationResultCard: React.FC<Props> = ({ result }) => {
  const tierInfo = tierColorMap[result.tier] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-500' };

  return (
    <div className={`bg-white rounded-lg shadow-md border-l-4 ${tierInfo.border} p-4 mb-4`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{result.candidateName || result.candidateId}</h3>
          <p className={`text-sm font-medium capitalize ${tierInfo.text}`}>{result.tier}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-800">{result.scores.overall.toFixed(0)}</p>
          <p className="text-xs text-gray-500">Overall Score</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-700">{result.explanation}</p>
      </div>

      {/* Detailed Scores */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="font-semibold text-gray-700">Technical</p>
          <p className="text-lg font-bold">{result.scores.technicalSkills?.toFixed(0) || result.scores.preferredQualifications?.toFixed(0) || 'N/A'}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="font-semibold text-gray-700">Experience</p>
          <p className="text-lg font-bold">{result.scores.experienceRelevance?.toFixed(0) || 'N/A'}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="font-semibold text-gray-700">Education</p>
          <p className="text-lg font-bold">{result.scores.educationCertifications?.toFixed(0) || 'N/A'}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="font-semibold text-gray-700">Soft Skills</p>
          <p className="text-lg font-bold">{result.scores.softSkillsCulture?.toFixed(0) || 'N/A'}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="font-semibold text-gray-700">Quality</p>
          <p className="text-lg font-bold">{result.scores.resumeQuality?.toFixed(0) || result.scores.professionalism?.toFixed(0) || 'N/A'}</p>
        </div>
      </div>

      {/* Hiring Recommendation */}
      {result.hiringRecommendation && (
        <div className="mt-3 p-2 bg-indigo-50 rounded">
          <p className="text-sm font-semibold text-indigo-800">
            Recommendation: {result.hiringRecommendation}
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-green-700">Strengths</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
            {result.strengths.map((strength, i) => <li key={i}>{strength}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-red-700">Gaps</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-1">
            {result.gaps.map((gap, i) => <li key={i}>{gap}</li>)}
          </ul>
        </div>
      </div>

      {/* Red Flags if any */}
      {result.redFlags && result.redFlags.length > 0 && (
        <div className="mt-3 p-2 bg-red-50 rounded">
          <h4 className="font-semibold text-red-700 text-sm">Concerns:</h4>
          <ul className="list-disc list-inside text-sm text-red-600 mt-1">
            {result.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EvaluationResultCard;
