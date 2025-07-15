import { describe, it, expect, beforeEach, vi } from 'vitest'
import { feedsApi } from '../api/feeds'
import { ApiClient } from '../api/client'
import type { Feed, CreateFeedRequest, UpdateFeedRequest } from '../types'

// Mock the ApiClient
vi.mock('../api/client', () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  })),
}))

describe('feedsApi', () => {
  let mockClient: any

  beforeEach(() => {
    mockClient = new ApiClient()
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('fetches all feeds', async () => {
      const mockFeeds: Feed[] = [
        {
          id: 1,
          name: 'Test Feed 1',
          email_rule_id: 1,
          feed_type: 'rss',
          description: 'Test Description 1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Test Feed 2',
          email_rule_id: 2,
          feed_type: 'atom',
          description: 'Test Description 2',
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
        id: 1,
        name: 'Test Feed',
        email_rule_id: 1,
        feed_type: 'rss',
        description: 'Test Description',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockClient.get.mockResolvedValueOnce(mockFeed)

      const result = await feedsApi.getById(1)

      expect(mockClient.get).toHaveBeenCalledWith('/api/feeds/1')
      expect(result).toEqual(mockFeed)
    })

    it('handles not found', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.getById(999)).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('create', () => {
    it('creates new RSS feed', async () => {
      const createRequest: CreateFeedRequest = {
        name: 'New RSS Feed',
        email_rule_id: 1,
        feed_type: 'rss',
        description: 'New RSS Description',
      }

      const mockCreatedFeed: Feed = {
        id: 1,
        ...createRequest,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockClient.post.mockResolvedValueOnce(mockCreatedFeed)

      const result = await feedsApi.create(createRequest)

      expect(mockClient.post).toHaveBeenCalledWith('/api/feeds', createRequest)
      expect(result).toEqual(mockCreatedFeed)
    })

    it('creates new Atom feed', async () => {
      const createRequest: CreateFeedRequest = {
        name: 'New Atom Feed',
        email_rule_id: 1,
        feed_type: 'atom',
        description: 'New Atom Description',
      }

      const mockCreatedFeed: Feed = {
        id: 1,
        ...createRequest,
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
        name: '',
        email_rule_id: 1,
        feed_type: 'rss',
        description: 'New Description',
      }

      mockClient.post.mockRejectedValueOnce(new Error('HTTP 400: Bad Request'))

      await expect(feedsApi.create(createRequest)).rejects.toThrow('HTTP 400: Bad Request')
    })
  })

  describe('update', () => {
    it('updates existing feed', async () => {
      const updateRequest: UpdateFeedRequest = {
        name: 'Updated Feed',
        email_rule_id: 1,
        feed_type: 'atom',
        description: 'Updated Description',
      }

      const mockUpdatedFeed: Feed = {
        id: 1,
        ...updateRequest,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z',
      }

      mockClient.put.mockResolvedValueOnce(mockUpdatedFeed)

      const result = await feedsApi.update(1, updateRequest)

      expect(mockClient.put).toHaveBeenCalledWith('/api/feeds/1', updateRequest)
      expect(result).toEqual(mockUpdatedFeed)
    })

    it('handles not found on update', async () => {
      const updateRequest: UpdateFeedRequest = {
        name: 'Updated Feed',
        email_rule_id: 1,
        feed_type: 'rss',
        description: 'Updated Description',
      }

      mockClient.put.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.update(999, updateRequest)).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('delete', () => {
    it('deletes feed', async () => {
      mockClient.delete.mockResolvedValueOnce(null)

      await feedsApi.delete(1)

      expect(mockClient.delete).toHaveBeenCalledWith('/api/feeds/1')
    })

    it('handles not found on delete', async () => {
      mockClient.delete.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.delete(999)).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('getByRuleId', () => {
    it('fetches feeds by rule ID', async () => {
      const mockFeeds: Feed[] = [
        {
          id: 1,
          name: 'Feed 1',
          email_rule_id: 1,
          feed_type: 'rss',
          description: 'Description 1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Feed 2',
          email_rule_id: 1,
          feed_type: 'atom',
          description: 'Description 2',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ]

      mockClient.get.mockResolvedValueOnce(mockFeeds)

      const result = await feedsApi.getByRuleId(1)

      expect(mockClient.get).toHaveBeenCalledWith('/api/feeds?email_rule_id=1')
      expect(result).toEqual(mockFeeds)
    })

    it('handles empty result for rule', async () => {
      mockClient.get.mockResolvedValueOnce([])

      const result = await feedsApi.getByRuleId(999)

      expect(result).toEqual([])
    })
  })

  describe('getRssFeed', () => {
    it('fetches RSS feed content', async () => {
      const mockRssContent = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>Test Description</description>
    <item>
      <title>Test Item</title>
      <description>Test Item Description</description>
    </item>
  </channel>
</rss>`

      mockClient.get.mockResolvedValueOnce(mockRssContent)

      const result = await feedsApi.getRssFeed(1)

      expect(mockClient.get).toHaveBeenCalledWith('/feeds/1/rss')
      expect(result).toEqual(mockRssContent)
    })

    it('handles not found for RSS feed', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.getRssFeed(999)).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('getAtomFeed', () => {
    it('fetches Atom feed content', async () => {
      const mockAtomContent = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Feed</title>
  <subtitle>Test Description</subtitle>
  <entry>
    <title>Test Item</title>
    <content>Test Item Description</content>
  </entry>
</feed>`

      mockClient.get.mockResolvedValueOnce(mockAtomContent)

      const result = await feedsApi.getAtomFeed(1)

      expect(mockClient.get).toHaveBeenCalledWith('/feeds/1/atom')
      expect(result).toEqual(mockAtomContent)
    })

    it('handles not found for Atom feed', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(feedsApi.getAtomFeed(999)).rejects.toThrow('HTTP 404: Not Found')
    })
  })
})