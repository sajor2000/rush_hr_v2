'use client';

import { useMemo } from 'react';
import { EvaluationResult } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AdaptiveResultsProps {
  results: EvaluationResult[];
}

const tierColors: { [key: string]: string } = {
  'Top Tier': '#22c55e',
  'Promising': '#3b82f6',
  'Not a Fit': '#ef4444',
};

export default function AdaptiveResults({ results }: AdaptiveResultsProps) {
  const tierCounts = useMemo(() => {
    return results.reduce((acc, result) => {
      const tier = result.tier || 'Not a Fit';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [results]);

  const chartData = useMemo(() => {
    return Object.entries(tierCounts).map(([name, value]) => ({ name, count: value }));
  }, [tierCounts]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Evaluation Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
        {Object.entries(tierCounts).map(([tier, count]) => (
          <div key={tier} className="p-4 rounded-lg" style={{ backgroundColor: `${tierColors[tier]}20` }}>
            <p className="text-2xl font-bold" style={{ color: tierColors[tier] }}>{count}</p>
            <p className="text-sm font-medium text-gray-600">{tier}</p>
          </div>
        ))}
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Candidates" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
