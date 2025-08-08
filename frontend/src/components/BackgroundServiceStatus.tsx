import React from 'react';
import { useBackgroundService } from '../hooks/useBackgroundService';
import { ServiceState } from '../api/background';

interface BackgroundServiceStatusProps {
  className?: string;
}

export const BackgroundServiceStatus: React.FC<BackgroundServiceStatusProps> = ({ 
  className = '' 
}) => {
  const {
    status,
    loading,
    error,
    isServiceRunning,
    refreshStatus,
    startService,
    stopService,
    restartService,
    processAllAccounts,
  } = useBackgroundService();

  const renderIcon = (iconName: string, className: string = 'w-5 h-5') => {
    const iconProps = {
      className,
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    };

    switch (iconName) {
      case 'check-circle':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'stop':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
          </svg>
        );
      case 'clock':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'exclamation-triangle':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.764 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'cog':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'arrow-path':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        );
      case 'play':
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStateDisplay = (state: ServiceState) => {
    if (typeof state === 'string') {
      return {
        text: state,
        color: state === 'Running' ? 'text-green-600' : 
               state === 'Stopped' ? 'text-gray-600' :
               state === 'Starting' ? 'text-blue-600' :
               state === 'Stopping' ? 'text-yellow-600' : 'text-gray-600',
        bgColor: state === 'Running' ? 'bg-green-100' : 
                 state === 'Stopped' ? 'bg-gray-100' :
                 state === 'Starting' ? 'bg-blue-100' :
                 state === 'Stopping' ? 'bg-yellow-100' : 'bg-gray-100',
        icon: state === 'Running' ? 'check-circle' :
              state === 'Stopped' ? 'stop' :
              state === 'Starting' || state === 'Stopping' ? 'clock' : 'exclamation-triangle'
      };
    } else if (state && typeof state === 'object' && 'Error' in state) {
      return {
        text: `Error: ${state.Error}`,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: 'exclamation-triangle'
      };
    } else {
      // Fallback for unexpected state format
      return {
        text: `Unknown state: ${JSON.stringify(state)}`,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: 'exclamation-triangle'
      };
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading && !status) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="flex items-center space-x-3 text-red-600 mb-4">
          {renderIcon('exclamation-triangle', 'w-6 h-6')}
          <h3 className="text-lg font-semibold">Background Service Error</h3>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={refreshStatus}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status || !status.state) {
    return null;
  }

  const stateDisplay = getStateDisplay(status.state);

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {renderIcon('cog', 'w-6 h-6 text-gray-600')}
          <h3 className="text-lg font-semibold text-gray-900">Background Processing Service</h3>
        </div>
        <button
          onClick={refreshStatus}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          {renderIcon('arrow-path', `w-5 h-5 ${loading ? 'animate-spin' : ''}`)}
        </button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center space-x-3 mb-6">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${stateDisplay.bgColor}`}>
          <div className={stateDisplay.color}>
            {renderIcon(stateDisplay.icon, 'w-5 h-5')}
          </div>
          <span className={`font-medium ${stateDisplay.color}`}>
            {stateDisplay.text}
          </span>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{status.accounts_count}</div>
          <div className="text-sm text-gray-500">Accounts</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{status.active_processing_count}</div>
          <div className="text-sm text-gray-500">Processing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{status.total_emails_processed}</div>
          <div className="text-sm text-gray-500">Emails Processed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{status.total_errors}</div>
          <div className="text-sm text-gray-500">Errors</div>
        </div>
      </div>

      {/* Service Information */}
      <div className="space-y-3 mb-6 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Started At:</span>
          <span className="text-gray-900">{formatTimestamp(status.started_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Uptime:</span>
          <span className="text-gray-900">{formatUptime(status.uptime_seconds)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Check Interval:</span>
          <span className="text-gray-900">{status.config.global_interval_minutes} minutes</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Max Concurrent:</span>
          <span className="text-gray-900">{status.config.max_concurrent_accounts}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-2">
        {!isServiceRunning ? (
          <button
            onClick={() => startService()}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {renderIcon('play', 'w-4 h-4')}
            <span>Start Service</span>
          </button>
        ) : (
          <button
            onClick={stopService}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {renderIcon('stop', 'w-4 h-4')}
            <span>Stop Service</span>
          </button>
        )}
        
        <button
          onClick={restartService}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {renderIcon('arrow-path', 'w-4 h-4')}
          <span>Restart</span>
        </button>

        <button
          onClick={processAllAccounts}
          disabled={loading || !isServiceRunning}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {renderIcon('cog', 'w-4 h-4')}
          <span>Process All</span>
        </button>
      </div>

      {/* Configuration Details (Collapsible) */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
          Configuration Details
        </summary>
        <div className="mt-3 pl-4 space-y-2 text-sm text-gray-600">
          <div>Per-account interval: {status.config.per_account_interval_minutes} minutes</div>
          <div>Max emails per run: {status.config.limits.max_emails_per_run}</div>
          <div>Processing timeout: {status.config.limits.max_processing_time_seconds} seconds</div>
          <div>Max email age: {status.config.limits.max_email_age_days} days</div>
          <div>Retry attempts: {status.config.retry.max_attempts}</div>
          <div>Initial retry delay: {status.config.retry.initial_delay_seconds} seconds</div>
        </div>
      </details>
    </div>
  );
};