import { apiClient } from './client';

export interface BackgroundConfig {
  global_interval_minutes: number;
  per_account_interval_minutes: number;
  max_concurrent_accounts: number;
  enabled: boolean;
  retry: {
    max_attempts: number;
    initial_delay_seconds: number;
    max_delay_seconds: number;
    backoff_multiplier: number;
  };
  limits: {
    max_emails_per_run: number;
    max_processing_time_seconds: number;
    max_email_age_days: number;
  };
}

export type ServiceState = 
  | 'Stopped'
  | 'Starting' 
  | 'Running'
  | 'Stopping'
  | { Error: string };

export interface ServiceStatus {
  state: ServiceState;
  started_at?: number;
  config: BackgroundConfig;
  accounts_count: number;
  active_processing_count: number;
  total_emails_processed: number;
  total_errors: number;
  uptime_seconds?: number;
}

export interface ServiceActionResponse {
  success: boolean;
  message: string;
}

export interface ProcessAccountResponse {
  account_id: string;
  success: boolean;
  message: string;
}

export interface StartServiceRequest {
  force?: boolean;
}

export const backgroundApi = {
  // Get background service status
  async getStatus(): Promise<ServiceStatus> {
    const response = await apiClient.get<{ status: ServiceStatus }>('/api/background/status');
    return response.status;
  },

  // Start the background service
  async startService(request: StartServiceRequest = {}): Promise<ServiceActionResponse> {
    return apiClient.post<ServiceActionResponse>('/api/background/start', request);
  },

  // Stop the background service
  async stopService(): Promise<ServiceActionResponse> {
    return apiClient.post<ServiceActionResponse>('/api/background/stop', {});
  },

  // Restart the background service
  async restartService(): Promise<ServiceActionResponse> {
    return apiClient.post<ServiceActionResponse>('/api/background/restart', {});
  },

  // Process a specific account manually
  async processAccount(accountId: string): Promise<ProcessAccountResponse> {
    return apiClient.post<ProcessAccountResponse>(`/api/background/process/${accountId}`, {});
  },

  // Process all accounts manually
  async processAllAccounts(): Promise<ServiceActionResponse> {
    return apiClient.post<ServiceActionResponse>('/api/background/process-all', {});
  },
};