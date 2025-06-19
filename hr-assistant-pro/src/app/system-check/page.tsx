'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationCircleIcon,
  ArrowPathIcon,
  CpuChipIcon,
  ServerIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'error';
  responseTime?: number;
  error?: string;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  azure: {
    enabled: boolean;
    endpoint?: string;
    deployment?: string;
  };
  services: ServiceStatus[];
  systemInfo: {
    nodeVersion: string;
    platform: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  totalResponseTime?: number;
}

export default function SystemCheckPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/system/health');
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'degraded':
        return <ExclamationCircleIcon className="h-6 w-6 text-yellow-500" />;
      case 'unhealthy':
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Health Check</h1>
          <p className="text-gray-600">Azure OpenAI Integration Status and Performance Monitoring</p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchHealthData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-rush-green text-white rounded-lg hover:bg-rush-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2 h-4 w-4 text-rush-green focus:ring-rush-green border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Auto-refresh (30s)</span>
            </label>
          </div>
          
          {healthData && (
            <div className="text-sm text-gray-500">
              Last checked: {new Date(healthData.timestamp).toLocaleString()}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading && !healthData ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : healthData ? (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className={`p-6 rounded-lg border-2 ${getStatusColor(healthData.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(healthData.status)}
                  <h2 className="ml-3 text-xl font-semibold">
                    System Status: {healthData.status.toUpperCase()}
                  </h2>
                </div>
                {healthData.totalResponseTime && (
                  <div className="flex items-center text-sm">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Total check time: {healthData.totalResponseTime}ms
                  </div>
                )}
              </div>
            </div>

            {/* AI Configuration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CpuChipIcon className="h-5 w-5 mr-2" />
                AI Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Provider</p>
                  <p className="font-medium">{healthData.azure.enabled ? 'Azure OpenAI' : 'OpenAI'}</p>
                </div>
                {healthData.azure.enabled && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Deployment</p>
                      <p className="font-medium">{healthData.azure.deployment}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Endpoint</p>
                      <p className="font-medium text-sm break-all">{healthData.azure.endpoint}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Service Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Service Status</h3>
              <div className="space-y-3">
                {healthData.services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {getStatusIcon(service.status)}
                      <span className="ml-3 font-medium">{service.name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      {service.responseTime && (
                        <span className="text-sm text-gray-600">
                          {service.responseTime}ms
                        </span>
                      )}
                      {service.error && (
                        <span className="text-sm text-red-600">
                          {service.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <ServerIcon className="h-5 w-5 mr-2" />
                System Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Node Version</p>
                  <p className="font-medium">{healthData.systemInfo.nodeVersion}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Platform</p>
                  <p className="font-medium">{healthData.systemInfo.platform}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Memory Usage</p>
                  <p className="font-medium">
                    {healthData.systemInfo.memory.used}MB / {healthData.systemInfo.memory.total}MB 
                    ({healthData.systemInfo.memory.percentage}%)
                  </p>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-rush-green h-2 rounded-full"
                      style={{ width: `${healthData.systemInfo.memory.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}