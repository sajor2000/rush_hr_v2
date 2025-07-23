'use client';

import React from 'react';
import { EvaluationResult } from '@/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface EnhancedResultsVisualizationProps {
  results: EvaluationResult[];
  jobRequirements?: any;
}

export default function EnhancedResultsVisualization({ 
  results, 
  jobRequirements 
}: EnhancedResultsVisualizationProps) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12">
        <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No results to visualize yet</p>
      </div>
    );
  }

  // Prepare data for charts
  const scoreData = results.map(result => ({
    name: result.candidateName,
    overall: result.scores.overall,
    professionalism: result.scores.professionalism,
    preferredQualifications: result.scores.preferredQualifications,
    tier: result.tier
  }));

  const tierDistribution = results.reduce((acc, result) => {
    acc[result.tier] = (acc[result.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tierData = Object.entries(tierDistribution).map(([tier, count]) => ({
    name: tier,
    value: count,
    color: getTierColor(tier)
  }));

  const qualifiedCount = results.filter(r => r.mustHavesMet).length;
  const totalCount = results.length;
  const qualificationRate = (qualifiedCount / totalCount) * 100;

  const averageScore = results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length;
  const topPerformers = results
    .filter(r => r.mustHavesMet)
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .slice(0, 3);

  function getTierColor(tier: string): string {
    const colors = {
      'Top Tier': '#10B981',
      'Qualified': '#3B82F6',
      'Potential': '#F59E0B',
      'Not Qualified': '#EF4444',
      'Not a Fit': '#6B7280'
    };
    return colors[tier as keyof typeof colors] || '#6B7280';
  }

  function getTierIcon(tier: string) {
    switch (tier) {
      case 'Top Tier':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'Qualified':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'Potential':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'Not Qualified':
      case 'Not a Fit':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Candidates</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-rush-green" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Qualified</p>
              <p className="text-2xl font-bold text-green-600">{qualifiedCount}</p>
              <p className="text-sm text-gray-500">{qualificationRate.toFixed(1)}%</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-rush-green">{averageScore.toFixed(1)}%</p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-rush-green" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Performers</p>
              <p className="text-2xl font-bold text-blue-600">{topPerformers.length}</p>
              <p className="text-sm text-gray-500">90%+ scores</p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Score Distribution Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="overall" fill="#004E25" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tier Distribution Pie Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tierData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {tierData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Score Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Score Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={scoreData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="overall" fill="#004E25" name="Overall" radius={[4, 4, 0, 0]} />
            <Bar dataKey="professionalism" fill="#00729A" name="Professionalism" radius={[4, 4, 0, 0]} />
            <Bar dataKey="preferredQualifications" fill="#10B981" name="Preferred Qualifications" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Performers List */}
      {topPerformers.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-4">
            {topPerformers.map((candidate, index) => (
              <div key={candidate.candidateId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-rush-green text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{candidate.candidateName}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getTierIcon(candidate.tier)}
                      <span className="text-sm text-gray-600">{candidate.tier}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-rush-green">{candidate.scores.overall}%</p>
                  <p className="text-sm text-gray-500">Overall Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(tierDistribution).map(([tier, count]) => (
            <div key={tier} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                {getTierIcon(tier)}
                <div>
                  <p className="font-medium text-gray-900">{tier}</p>
                  <p className="text-sm text-gray-500">{count} candidate{count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold" style={{ color: getTierColor(tier) }}>
                  {((count / totalCount) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 