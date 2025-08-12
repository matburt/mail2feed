import { apiClient } from './client'
import type { 
  EmailRule, 
  CreateEmailRuleRequest, 
  UpdateEmailRuleRequest 
} from '../types'

export const rulesApi = {
  // Get all email rules
  getAll: () => 
    apiClient.get<EmailRule[]>('/api/email-rules'),

  // Get single email rule
  getById: (id: string) => 
    apiClient.get<EmailRule>(`/api/email-rules/${id}`),

  // Create new email rule
  create: (data: CreateEmailRuleRequest) => 
    apiClient.post<EmailRule>('/api/email-rules', data),

  // Update email rule
  update: (id: string, data: UpdateEmailRuleRequest) => 
    apiClient.put<EmailRule>(`/api/email-rules/${id}`, data),

  // Delete email rule
  delete: (id: string) => 
    apiClient.delete<void>(`/api/email-rules/${id}`),

  // Get rules by account ID
  getByAccountId: (accountId: string) => 
    apiClient.get<EmailRule[]>(`/api/email-rules?account_id=${accountId}`),
}