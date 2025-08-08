import React from 'react';
import { useBackgroundService } from '../hooks/useBackgroundService';

interface AccountProcessingButtonProps {
  accountId: string;
  accountName: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const AccountProcessingButton: React.FC<AccountProcessingButtonProps> = ({
  accountId,
  accountName,
  size = 'md',
  className = '',
}) => {
  const { processAccount, processingAccounts, isServiceRunning } = useBackgroundService(false);

  const isProcessing = processingAccounts.has(accountId);

  const handleProcess = async () => {
    await processAccount(accountId);
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  const renderIcon = (iconName: string, className: string) => {
    const iconProps = {
      className,
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    };

    switch (iconName) {
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
      default:
        return null;
    }
  };

  return (
    <button
      onClick={handleProcess}
      disabled={isProcessing || !isServiceRunning}
      className={`
        inline-flex items-center space-x-1 
        ${sizeClasses[size]}
        bg-blue-600 text-white rounded-md 
        hover:bg-blue-700 
        disabled:bg-gray-400 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
      title={
        !isServiceRunning 
          ? 'Background service is not running'
          : isProcessing 
          ? `Processing ${accountName}...`
          : `Process ${accountName} now`
      }
    >
      {isProcessing ? 
        renderIcon('arrow-path', `${iconSizeClasses[size]} animate-spin`) :
        renderIcon('cog', iconSizeClasses[size])
      }
      <span>
        {isProcessing ? 'Processing...' : 'Process Now'}
      </span>
    </button>
  );
};