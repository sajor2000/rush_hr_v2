'use client';

import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface EnhancedHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function EnhancedHeader({ 
  title = "HR Assistant Pro", 
  subtitle = "Streamline Your Hiring with AI-Powered Resume Evaluation"
}: EnhancedHeaderProps) {

  return (
    <header className="bg-white shadow-soft border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-rush-green to-rush-green-dark rounded-xl flex items-center justify-center shadow-medium">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-gradient">{title}</h1>
              <p className="text-sm text-neutral-gray-dark">{subtitle}</p>
            </div>
          </div>

        </div>

      </div>

      {/* Progress indicator for evaluation */}
      <div className="h-1 bg-gradient-to-r from-rush-green to-rush-blue opacity-0 transition-opacity duration-300" id="progress-bar">
        <div className="h-full bg-white/20 animate-pulse"></div>
      </div>
    </header>
  );
} 