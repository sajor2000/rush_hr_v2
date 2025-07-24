import React from 'react';

export default function ProcessingDisclaimer() {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">Important Notice About Resume Processing</h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>
              Our AI system processes resumes to extract relevant information. However, certain factors may affect accuracy:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Complex PDF formatting or scanned documents may not parse correctly</li>
              <li>Non-standard resume layouts might result in missed information</li>
              <li>Image-based resumes or those with heavy graphics may have reduced accuracy</li>
              <li>Candidates with lower scores should be manually reviewed, as the system may have misread their resume</li>
            </ul>
            <p className="mt-2 font-semibold">
              We strongly recommend manual review of all candidates, especially those in lower quartiles, to ensure no qualified candidates are overlooked due to processing issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}