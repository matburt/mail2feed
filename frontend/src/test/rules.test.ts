import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rulesApi } from '../api/rules'
import type { EmailRule, CreateEmailRuleRequest, UpdateEmailRuleRequest } from '../types'

// Mock the apiClient
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

vi.mock('../api/client', () => ({
  apiClient: mockClient
}))

describe('rulesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('fetches all rules', async () => {
      const mockRules: EmailRule[] = [
        {
          id: '1',
          name: 'Test Rule 1',
          imap_account_id: '1',
          folder: 'INBOX',
          from_address: 'test@example.com',
          subject_contains: 'Test Subject',
          is_active: true,
          post_process_action: 'do_nothing',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Test Rule 2',
          imap_account_id: '1',
          folder: 'INBOX',
          from_address: 'newsletter@example.com',
          subject_contains: 'Newsletter',
          is_active: true,
          post_process_action: 'mark_read',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ]

      mockClient.get.mockResolvedValueOnce(mockRules)

      const result = await rulesApi.getAll()

      expect(mockClient.get).toHaveBeenCalledWith('/api/email-rules')
      expect(result).toEqual(mockRules)
    })

    it('handles empty response', async () => {
      mockClient.get.mockResolvedValueOnce([])

      const result = await rulesApi.getAll()

      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('fetches rule by ID', async () => {
      const mockRule: EmailRule = {
        id: '1',
        name: 'Test Rule',
        imap_account_id: '1',
        folder: 'INBOX',
        from_address: 'test@example.com',
        subject_contains: 'Test Subject',
        is_active: true,
        post_process_action: 'do_nothing',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockClient.get.mockResolvedValueOnce(mockRule)

      const result = await rulesApi.getById('1')

      expect(mockClient.get).toHaveBeenCalledWith('/api/email-rules/1')
      expect(result).toEqual(mockRule)
    })

    it('handles not found', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(rulesApi.getById('999')).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('create', () => {
    it('creates new rule', async () => {
      const createRequest: CreateEmailRuleRequest = {
        name: 'New Rule',
        imap_account_id: '1',
        folder: 'INBOX',
        from_address: 'new@example.com',
        subject_contains: 'New Subject',
        is_active: true,
      }

      const mockCreatedRule: EmailRule = {
        id: '1',
        ...createRequest,
        post_process_action: 'do_nothing',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockClient.post.mockResolvedValueOnce(mockCreatedRule)

      const result = await rulesApi.create(createRequest)

      expect(mockClient.post).toHaveBeenCalledWith('/api/email-rules', createRequest)
      expect(result).toEqual(mockCreatedRule)
    })

    it('creates rule with null body pattern', async () => {
      const createRequest: CreateEmailRuleRequest = {
        name: 'New Rule',
        imap_account_id: '1',
        folder: 'INBOX',
        from_address: 'new@example.com',
        subject_contains: 'New Subject',
        is_active: true,
      }

      const mockCreatedRule: EmailRule = {
        id: '1',
        ...createRequest,
        post_process_action: 'do_nothing',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockClient.post.mockResolvedValueOnce(mockCreatedRule)

      const result = await rulesApi.create(createRequest)

      expect(mockClient.post).toHaveBeenCalledWith('/api/email-rules', createRequest)
      expect(result).toEqual(mockCreatedRule)
    })

    it('handles validation error', async () => {
      const createRequest: CreateEmailRuleRequest = {
        name: '',
        imap_account_id: '1',
        folder: 'INBOX',
        from_address: 'new@example.com',
        subject_contains: 'New Subject',
        is_active: true,
      }

      mockClient.post.mockRejectedValueOnce(new Error('HTTP 400: Bad Request'))

      await expect(rulesApi.create(createRequest)).rejects.toThrow('HTTP 400: Bad Request')
    })
  })

  describe('update', () => {
    it('updates existing rule', async () => {
      const updateRequest: UpdateEmailRuleRequest = {
        name: 'Updated Rule',
        imap_account_id: '1',
        folder: 'INBOX',
        from_address: 'updated@example.com',
        subject_contains: 'Updated Subject',
        is_active: true,
      }

      const mockUpdatedRule: EmailRule = {
        id: '1',
        ...updateRequest,
        post_process_action: 'do_nothing',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z',
      }

      mockClient.put.mockResolvedValueOnce(mockUpdatedRule)

      const result = await rulesApi.update('1', updateRequest)

      expect(mockClient.put).toHaveBeenCalledWith('/api/email-rules/1', updateRequest)
      expect(result).toEqual(mockUpdatedRule)
    })

    it('handles not found on update', async () => {
      const updateRequest: UpdateEmailRuleRequest = {
        name: 'Updated Rule',
        imap_account_id: '1',
        folder: 'INBOX',
        from_address: 'updated@example.com',
        subject_contains: 'Updated Subject',
        is_active: true,
      }

      mockClient.put.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(rulesApi.update('999', updateRequest)).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('delete', () => {
    it('deletes rule', async () => {
      mockClient.delete.mockResolvedValueOnce(null)

      await rulesApi.delete('1')

      expect(mockClient.delete).toHaveBeenCalledWith('/api/email-rules/1')
    })

    it('handles not found on delete', async () => {
      mockClient.delete.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(rulesApi.delete('999')).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('getByAccountId', () => {
    it('fetches rules by account ID', async () => {
      const mockRules: EmailRule[] = [
        {
          id: '1',
          name: 'Rule 1',
          imap_account_id: '1',
          folder: 'INBOX',
          from_address: 'test1@example.com',
          subject_contains: 'Test 1',
          is_active: true,
          post_process_action: 'do_nothing',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Rule 2',
          imap_account_id: '1',
          folder: 'INBOX',
          from_address: 'test2@example.com',
          subject_contains: 'Test 2',
          is_active: true,
          post_process_action: 'do_nothing',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ]

      mockClient.get.mockResolvedValueOnce(mockRules)

      const result = await rulesApi.getByAccountId('1')

      expect(mockClient.get).toHaveBeenCalledWith('/api/email-rules?account_id=1')
      expect(result).toEqual(mockRules)
    })

    it('handles empty result for account', async () => {
      mockClient.get.mockResolvedValueOnce([])

      const result = await rulesApi.getByAccountId('999')

      expect(result).toEqual([])
    })
  })
})