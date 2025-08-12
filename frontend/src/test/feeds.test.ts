import { describe, it, expect, beforeEach, vi } from 'vitest'
import { feedsApi } from '../api/feeds'
import type { Feed, CreateFeedRequest, UpdateFeedRequest } from '../types'

// Mock the apiClient
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
}

vi.mock('../api/client', () => ({
  apiClient: mockClient
}))

describe('feedsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('fetches all feeds', async () => {
      const mockFeeds: Feed[] = [
        {
          id: '1',
          title: 'Test Feed 1',
          email_rule_id: '1',
          feed_type: 'rss',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Test Feed 2',
          email_rule_id: '1',
          feed_type: 'atom',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ]

      mockClient.get.mockResolvedValueOnce(mockFeeds)

      const result = await feedsApi.getAll()

      expect(mockClient.get).toHaveBeenCalledWith('/api/feeds')
      expect(result).toEqual(mockFeeds)
    })

    it('handles empty response', async () => {
      mockClient.get.mockResolvedValueOnce([])

      const result = await feedsApi.getAll()

      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('fetches feed by ID', async () => {
      const mockFeed: Feed = {
        id: '1',
        title: 'Test Feed',
        email_rule_id: '1',
        feed_type: 'rss',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockClient.get.mockResolvedValueOnce(mockFeed)

      const result = await feedsApi.getById('1')

      expect(mockClient.get).toHaveBeenCalledWith('/api/feeds/1')
      expect(result).toEqual(mockFeed)
    })

    it('handles not found', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.getById('999')).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('create', () => {
    it('creates new feed', async () => {
      const createRequest: CreateFeedRequest = {
        title: 'New Feed',
        email_rule_id: '1',
        feed_type: 'rss',
        is_active: true,
      }

      const mockCreatedFeed: Feed = {
        id: '1',
        ...createRequest,
        feed_type: createRequest.feed_type as 'rss' | 'atom',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockClient.post.mockResolvedValueOnce(mockCreatedFeed)

      const result = await feedsApi.create(createRequest)

      expect(mockClient.post).toHaveBeenCalledWith('/api/feeds', createRequest)
      expect(result).toEqual(mockCreatedFeed)
    })

    it('handles validation error', async () => {
      const createRequest: CreateFeedRequest = {
        title: '',
        email_rule_id: '1',
        feed_type: 'rss',
        is_active: true,
      }

      mockClient.post.mockRejectedValueOnce(new Error('HTTP 400: Bad Request'))

      await expect(feedsApi.create(createRequest)).rejects.toThrow('HTTP 400: Bad Request')
    })
  })

  describe('update', () => {
    it('updates existing feed', async () => {
      const updateRequest: UpdateFeedRequest = {
        title: 'Updated Feed',
        email_rule_id: '1',
        feed_type: 'atom',
        is_active: false,
      }

      const mockUpdatedFeed: Feed = {
        id: '1',
        ...updateRequest,
        feed_type: updateRequest.feed_type as 'rss' | 'atom',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z',
      }

      mockClient.put.mockResolvedValueOnce(mockUpdatedFeed)

      const result = await feedsApi.update('1', updateRequest)

      expect(mockClient.put).toHaveBeenCalledWith('/api/feeds/1', updateRequest)
      expect(result).toEqual(mockUpdatedFeed)
    })

    it('handles not found on update', async () => {
      const updateRequest: UpdateFeedRequest = {
        title: 'Updated Feed',
        email_rule_id: '1',
        feed_type: 'rss',
        is_active: true,
      }

      mockClient.put.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.update('999', updateRequest)).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('delete', () => {
    it('deletes feed', async () => {
      mockClient.delete.mockResolvedValueOnce(null)

      await feedsApi.delete('1')

      expect(mockClient.delete).toHaveBeenCalledWith('/api/feeds/1')
    })

    it('handles not found on delete', async () => {
      mockClient.delete.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.delete('999')).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('getItems', () => {
    it('fetches feed items', async () => {
      const mockItems = [
        {
          id: '1',
          feed_id: '1',
          title: 'Item 1',
          pub_date: '2023-01-01T00:00:00Z',
          created_at: '2023-01-01T00:00:00Z',
        }
      ]

      mockClient.get.mockResolvedValueOnce(mockItems)

      const result = await feedsApi.getItems('1')

      expect(mockClient.get).toHaveBeenCalledWith('/api/feeds/1/items')
      expect(result).toEqual(mockItems)
    })

    it('fetches feed items with limit', async () => {
      const mockItems: any[] = []
      mockClient.get.mockResolvedValueOnce(mockItems)

      await feedsApi.getItems('1', 10)

      expect(mockClient.get).toHaveBeenCalledWith('/api/feeds/1/items?limit=10')
    })
  })

  describe('getRss', () => {
    it('fetches RSS feed content', async () => {
      const mockRssFeed = '<?xml version="1.0"?>'
      
      mockClient.get.mockResolvedValueOnce(mockRssFeed)

      const result = await feedsApi.getRss('1')

      expect(mockClient.get).toHaveBeenCalledWith('/feeds/1/rss')
      expect(result).toBe(mockRssFeed)
    })

    it('handles RSS feed not found', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.getRss('999')).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('getAtom', () => {
    it('fetches Atom feed content', async () => {
      const mockAtomFeed = '<?xml version="1.0" encoding="utf-8"?>'
      
      mockClient.get.mockResolvedValueOnce(mockAtomFeed)

      const result = await feedsApi.getAtom('1')

      expect(mockClient.get).toHaveBeenCalledWith('/feeds/1/atom')
      expect(result).toBe(mockAtomFeed)
    })

    it('handles Atom feed not found', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.getAtom('999')).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('processAll', () => {
    it('processes all accounts', async () => {
      const mockStatus = {
        total_emails_processed: 10,
        new_feed_items_created: 5,
        errors: [],
      }
      
      mockClient.post.mockResolvedValueOnce(mockStatus)

      const result = await feedsApi.processAll()

      expect(mockClient.post).toHaveBeenCalledWith('/api/imap/process-all', {})
      expect(result).toEqual(mockStatus)
    })
  })
})