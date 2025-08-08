import { useState, useEffect, useCallback, useRef } from 'react';
import { backgroundApi, ServiceStatus, ServiceActionResponse, ProcessAccountResponse } from '../api/background';
import { useToast } from '../components/common/Toast';

export interface UseBackgroundServiceResult {
  status: ServiceStatus | null;
  loading: boolean;
  error: string | null;
  isServiceRunning: boolean;
  refreshStatus: () => Promise<void>;
  startService: (force?: boolean) => Promise<void>;
  stopService: () => Promise<void>;
  restartService: () => Promise<void>;
  processAccount: (accountId: string) => Promise<void>;
  processAllAccounts: () => Promise<void>;
  processingAccounts: Set<string>;
}

const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

export function useBackgroundService(autoRefresh: boolean = true): UseBackgroundServiceResult {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingAccounts, setProcessingAccounts] = useState<Set<string>>(new Set());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();

  const isServiceRunning = status?.state === 'Running';

  const refreshStatus = useCallback(async () => {
    try {
      setError(null);
      const newStatus = await backgroundApi.getStatus();
      setStatus(newStatus);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch service status';
      setError(errorMessage);
      console.error('Failed to fetch background service status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const startService = useCallback(async (force: boolean = false) => {
    try {
      setLoading(true);
      const response: ServiceActionResponse = await backgroundApi.startService({ force });
      
      if (response.success) {
        toast.success('Service Started', response.message);
        await refreshStatus();
      } else {
        toast.error('Start Failed', response.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start service';
      toast.error('Start Failed', errorMessage);
      console.error('Failed to start background service:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  const stopService = useCallback(async () => {
    try {
      setLoading(true);
      const response: ServiceActionResponse = await backgroundApi.stopService();
      
      if (response.success) {
        toast.success('Service Stopped', response.message);
        await refreshStatus();
      } else {
        toast.error('Stop Failed', response.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop service';
      toast.error('Stop Failed', errorMessage);
      console.error('Failed to stop background service:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  const restartService = useCallback(async () => {
    try {
      setLoading(true);
      const response: ServiceActionResponse = await backgroundApi.restartService();
      
      if (response.success) {
        toast.success('Service Restarted', response.message);
        await refreshStatus();
      } else {
        toast.error('Restart Failed', response.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restart service';
      toast.error('Restart Failed', errorMessage);
      console.error('Failed to restart background service:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  const processAccount = useCallback(async (accountId: string) => {
    try {
      setProcessingAccounts(prev => new Set(prev).add(accountId));
      const response: ProcessAccountResponse = await backgroundApi.processAccount(accountId);
      
      if (response.success) {
        toast.success('Account Processed', response.message);
      } else {
        toast.error('Processing Failed', response.message);
      }
      
      // Refresh status to get updated processing counts
      await refreshStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process account';
      toast.error('Processing Failed', errorMessage);
      console.error('Failed to process account:', err);
    } finally {
      setProcessingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  }, [refreshStatus]);

  const processAllAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await backgroundApi.processAllAccounts();
      
      if (response.success) {
        toast.success('Processing Triggered', response.message);
      } else {
        toast.error('Processing Failed', response.message);
      }
      
      // Refresh status to get updated processing counts
      await refreshStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process accounts';
      toast.error('Processing Failed', errorMessage);
      console.error('Failed to process all accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  // Initial load and auto-refresh setup
  useEffect(() => {
    refreshStatus();

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(refreshStatus, DEFAULT_REFRESH_INTERVAL);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshStatus]);

  return {
    status,
    loading,
    error,
    isServiceRunning,
    refreshStatus,
    startService,
    stopService,
    restartService,
    processAccount,
    processAllAccounts,
    processingAccounts,
  };
}