import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApiClient } from '../api/client'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ApiClient', () => {
  let client: ApiClient

  beforeEach(() => {
    client = new ApiClient('http://test-api.com')
    mockFetch.mockClear()
  })

  describe('constructor', () => {
    it('sets base URL correctly', () => {
      expect(client.baseUrl).toBe('http://test-api.com')
    })

    it('uses default base URL if none provided', () => {
      const defaultClient = new ApiClient()
      expect(defaultClient.baseUrl).toBe('http://localhost:3000')
    })
  })

  describe('request method', () => {
    it('makes GET request with correct parameters', async () => {
      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.request('/test', { method: 'GET' })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('makes POST request with body', async () => {
      const mockResponse = { id: 1 }
      const requestBody = { name: 'Test' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.request('/test', {
        method: 'POST',
        body: requestBody,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('handles custom headers', async () => {
      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await client.request('/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token',
          'Custom-Header': 'value',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token',
            'Custom-Header': 'value',
          },
        })
      )
    })

    it('throws error for non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' }),
      })

      await expect(client.request('/test')).rejects.toThrow('HTTP 404: Not Found')
    })

    it('throws error for network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.request('/test')).rejects.toThrow('Network error')
    })

    it('handles response without JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('No JSON body')
        },
      })

      const result = await client.request('/test')
      expect(result).toBeNull()
    })

    it('handles empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      })

      const result = await client.request('/test')
      expect(result).toBeNull()
    })
  })

  describe('HTTP method shortcuts', () => {
    it('get method works correctly', async () => {
      const mockResponse = { data: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.objectContaining({
          method: 'GET',
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('post method works correctly', async () => {
      const mockResponse = { id: 1 }
      const requestBody = { name: 'Test' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.post('/test', requestBody)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('put method works correctly', async () => {
      const mockResponse = { id: 1 }
      const requestBody = { name: 'Updated' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.put('/test/1', requestBody)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('delete method works correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      })

      const result = await client.delete('/test/1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(result).toBeNull()
    })
  })

  describe('URL building', () => {
    it('handles leading slash in endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      await client.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.any(Object)
      )
    })

    it('handles missing leading slash in endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      await client.get('test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.any(Object)
      )
    })

    it('handles trailing slash in base URL', async () => {
      const clientWithTrailingSlash = new ApiClient('http://test-api.com/')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      await clientWithTrailingSlash.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.any(Object)
      )
    })
  })
})