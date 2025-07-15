import { apiClient } from './client'
import type { 
  ImapAccount, 
  CreateImapAccountRequest, 
  UpdateImapAccountRequest,
  ConnectionTestResult 
} from '../types'

export const accountsApi = {
  // Get all IMAP accounts
  getAll: () => 
    apiClient.get<ImapAccount[]>('/api/imap-accounts'),

  // Get single IMAP account
  getById: (id: string) => 
    apiClient.get<ImapAccount>(`/api/imap-accounts/${id}`),

  // Create new IMAP account
  create: (data: CreateImapAccountRequest) => 
    apiClient.post<ImapAccount>('/api/imap-accounts', data),

  // Update IMAP account
  update: (id: string, data: UpdateImapAccountRequest) => 
    apiClient.put<ImapAccount>(`/api/imap-accounts/${id}`, data),

  // Delete IMAP account
  delete: (id: string) => 
    apiClient.delete<void>(`/api/imap-accounts/${id}`),

  // Test IMAP connection
  testConnection: (id: string) => 
    apiClient.get<ConnectionTestResult>(`/api/imap/${id}/test`),

  // Process emails for account
  processEmails: (id: string) => 
    apiClient.post<{ message: string }>(`/api/imap/${id}/process`, {}),
}