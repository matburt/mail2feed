import { apiClient } from './client'
import type { 
  Feed, 
  FeedItem,
  CreateFeedRequest, 
  UpdateFeedRequest,
  ProcessingStatus
} from '../types'

export const feedsApi = {
  // Get all feeds
  getAll: () => 
    apiClient.get<Feed[]>('/api/feeds'),

  // Get single feed
  getById: (id: string) => 
    apiClient.get<Feed>(`/api/feeds/${id}`),

  // Create new feed
  create: (data: CreateFeedRequest) => 
    apiClient.post<Feed>('/api/feeds', data),

  // Update feed
  update: (id: string, data: UpdateFeedRequest) => 
    apiClient.put<Feed>(`/api/feeds/${id}`, data),

  // Delete feed
  delete: (id: string) => 
    apiClient.delete<void>(`/api/feeds/${id}`),

  // Get feed items
  getItems: (id: string, limit?: number) => {
    const params = limit ? `?limit=${limit}` : ''
    return apiClient.get<FeedItem[]>(`/api/feeds/${id}/items${params}`)
  },

  // Get RSS feed content
  getRss: (id: string) => 
    apiClient.get<string>(`/feeds/${id}/rss`),

  // Get Atom feed content
  getAtom: (id: string) => 
    apiClient.get<string>(`/feeds/${id}/atom`),

  // Process all accounts
  processAll: () => 
    apiClient.post<ProcessingStatus>('/api/imap/process-all', {}),
}