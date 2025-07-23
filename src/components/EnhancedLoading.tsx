'use client';

import React from 'react';
import { 
  DocumentTextIcon, 
  CpuChipIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface LoadingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'loading' | 'completed' | 'error';
}

interface EnhancedLoadingProps {
  isVisible: boolean;
  currentStep?: string;
  progress?: number;
  statusMessage?: string;
  totalSteps?: number;
  onCancel?: () => void;
}

export default function EnhancedLoading({
  isVisible,
  currentStep,
  progress = 0,
  statusMessage = 'Processing...',
  totalSteps = 3,
  onCancel
}: EnhancedLoadingProps) {
  if (!isVisible) return null;

  const steps: LoadingStep[] = [
    {
      id: 'upload',
      title: 'Uploading Documents',
      description: 'Processing job description and resumes',
      icon: DocumentTextIcon,
      status: progress < 33 ? 'loading' : progress >= 33 ? 'completed' : 'pending'
    },
    {
      id: 'analysis',
      title: 'AI Analysis',
      description: 'Evaluating candidates against requirements',
      icon: CpuChipIcon,
      status: progress < 33 ? 'pending' : progress < 66 ? 'loading' : 'completed'
    },
    {
      id: 'results',
      title: 'Generating Results',
      description: 'Creating detailed evaluation report',
      icon: CheckCircleIcon,
      status: progress < 66 ? 'pending' : 'loading'
    }
  ];

  const getStepIcon = (step: LoadingStep) => {
    const baseClasses = "h-6 w-6 transition-all duration-300";
    
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon className={`${baseClasses} text-green-500`} />;
      case 'loading':
        return (
          <div className="relative">
            <step.icon className={`${baseClasses} text-rush-green animate-pulse`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-rush-green rounded-full animate-ping"></div>
            </div>
          </div>
        );
      case 'error':
        return <ExclamationTriangleIcon className={`${baseClasses} text-red-500`} />;
      default:
        return <step.icon className={`${baseClasses} text-gray-400`} />;
    }
  };

  const getStepClasses = (step: LoadingStep) => {
    const baseClasses = "flex items-center space-x-4 p-4 rounded-lg transition-all duration-300";
    
    switch (step.status) {
      case 'completed':
        return `${baseClasses} bg-green-50 border border-green-200`;
      case 'loading':
        return `${baseClasses} bg-rush-green/10 border border-rush-green/20 shadow-soft`;
      case 'error':
        return `${baseClasses} bg-red-50 border border-red-200`;
      default:
        return `${baseClasses} bg-gray-50 border border-gray-200`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="gradient-primary p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Processing Evaluation</h3>
              <p className="text-white/90 text-sm mt-1">{statusMessage}</p>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
                aria-label="Cancel processing"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            {Math.round(progress)}% Complete
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 pb-6 space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className={getStepClasses(step)}>
              <div className="flex-shrink-0">
                {getStepIcon(step)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-medium ${
                  step.status === 'completed' ? 'text-green-800' :
                  step.status === 'loading' ? 'text-rush-green' :
                  step.status === 'error' ? 'text-red-800' :
                  'text-gray-700'
                }`}>
                  {step.title}
                </h4>
                <p className={`text-xs mt-1 ${
                  step.status === 'completed' ? 'text-green-600' :
                  step.status === 'loading' ? 'text-rush-green/80' :
                  step.status === 'error' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {step.description}
                </p>
              </div>
              {step.status === 'loading' && (
                <div className="loading-dots text-rush-green">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            This process typically takes 2-5 minutes depending on the number of resumes
          </p>
        </div>
      </div>
    </div>
  );
}

// Compact loading component for inline use
export function CompactLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center space-x-3 p-4">
      <div className="loading-dots text-rush-green">
        <div></div>
        <div></div>
        <div></div>
      </div>
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  );
}

// Skeleton loading component for content placeholders
export function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  );
} 