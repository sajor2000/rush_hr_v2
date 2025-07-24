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

      {/* Transferable Skills */}
      {result.transferableSkills && result.transferableSkills.length > 0 && (
        <div className="mt-3 p-2 bg-purple-50 rounded">
          <h4 className="font-semibold text-purple-700 text-sm">Transferable Skills:</h4>
          <ul className="list-disc list-inside text-sm text-purple-600 mt-1">
            {result.transferableSkills.map((skill, i) => <li key={i}>{skill}</li>)}
          </ul>
        </div>
      )}

      {/* Preferred Qualifications Met */}
      {result.preferredQualificationsMet && result.preferredQualificationsMet.length > 0 && (
        <div className="mt-3 p-2 bg-blue-50 rounded">
          <h4 className="font-semibold text-blue-700 text-sm">Preferred Qualifications Met:</h4>
          <ul className="list-disc list-inside text-sm text-blue-600 mt-1">
            {result.preferredQualificationsMet.map((qual, i) => <li key={i}>{qual}</li>)}
          </ul>
        </div>
      )}

      {/* Soft Skills Identified */}
      {result.softSkillsIdentified && result.softSkillsIdentified.length > 0 && (
        <div className="mt-3 p-2 bg-teal-50 rounded">
          <h4 className="font-semibold text-teal-700 text-sm">Soft Skills Demonstrated:</h4>
          <ul className="list-disc list-inside text-sm text-teal-600 mt-1">
            {result.softSkillsIdentified.map((skill, i) => <li key={i}>{skill}</li>)}
          </ul>
        </div>
      )}

      {/* Score Breakdown - NEW */}
      {result.scoreBreakdown && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">Score Breakdown (Mathematical Calculation):</h4>
          <div className="space-y-2">
            {result.scoreBreakdown
              .filter(category => category.category !== 'bonus')
              .map((category, i) => (
                <div key={i} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium capitalize">{category.category.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-gray-600">
                      {category.rawScore.toFixed(1)}/{category.maxPossible} 
                      ({(category.rawScore/category.maxPossible * 100).toFixed(0)}%)
                      × {(category.weight * 100).toFixed(0)}% = 
                      <span className="font-semibold ml-1">{category.weightedScore.toFixed(1)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(category.rawScore/category.maxPossible * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            
            {/* Bonus Points */}
            {result.scoreBreakdown.find(c => c.category === 'bonus') && (
              <div className="mt-2 pt-2 border-t border-gray-300">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium">Bonus Points</span>
                  <span className="font-semibold text-green-600">
                    +{result.scoreBreakdown.find(c => c.category === 'bonus')?.rawScore || 0}
                  </span>
                </div>
              </div>
            )}
            
            {/* Total Score */}
            <div className="mt-2 pt-2 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Score</span>
                <span className="text-lg font-bold text-gray-800">{result.scores.overall}/100</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationResultCard;
