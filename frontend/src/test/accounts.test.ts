import { describe, it, expect, beforeEach, vi } from 'vitest'
import { accountsApi } from '../api/accounts'
import type { ImapAccount, CreateImapAccountRequest, UpdateImapAccountRequest } from '../types'

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

describe('accountsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('fetches all accounts', async () => {
      const mockAccounts: ImapAccount[] = [
        {
          id: '1',
          name: 'Test Account 1',
          host: 'imap.test1.com',
          port: 993,
          username: 'test1@test.com',
          password: 'password1',
          use_tls: true,
          default_post_process_action: 'do_nothing',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Test Account 2',
          host: 'imap.test2.com',
          port: 993,
          username: 'test2@test.com',
          password: 'password2',
          use_tls: true,
          default_post_process_action: 'mark_read',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ]

      mockClient.get.mockResolvedValueOnce(mockAccounts)

      const result = await accountsApi.getAll()

      expect(mockClient.get).toHaveBeenCalledWith('/api/imap-accounts')
      expect(result).toEqual(mockAccounts)
    })

    it('handles empty response', async () => {
      mockClient.get.mockResolvedValueOnce([])

      const result = await accountsApi.getAll()

      expect(result).toEqual([])
    })

    it('handles API error', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('API Error'))

      await expect(accountsApi.getAll()).rejects.toThrow('API Error')
    })
  })

  describe('getById', () => {
    it('fetches account by ID', async () => {
      const mockAccount: ImapAccount = {
        id: '1',
        name: 'Test Account',
        host: 'imap.test.com',
        port: 993,
        username: 'test@test.com',
        password: 'password',
        use_tls: true,
        default_post_process_action: 'do_nothing',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockClient.get.mockResolvedValueOnce(mockAccount)

      const result = await accountsApi.getById('1')

      expect(mockClient.get).toHaveBeenCalledWith('/api/imap-accounts/1')
      expect(result).toEqual(mockAccount)
    })

    it('handles not found', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(accountsApi.getById('999')).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('create', () => {
    it('creates new account', async () => {
      const createRequest: CreateImapAccountRequest = {
        name: 'New Account',
        host: 'imap.new.com',
        port: 993,
        username: 'new@test.com',
        password: 'newpassword',
        use_tls: true,
        default_post_process_action: 'do_nothing',
      }

      const mockCreatedAccount: ImapAccount = {
        id: '1',
        ...createRequest,
        default_post_process_action: 'do_nothing',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      mockClient.post.mockResolvedValueOnce(mockCreatedAccount)

      const result = await accountsApi.create(createRequest)

      expect(mockClient.post).toHaveBeenCalledWith('/api/imap-accounts', createRequest)
      expect(result).toEqual(mockCreatedAccount)
    })

    it('handles validation error', async () => {
      const createRequest: CreateImapAccountRequest = {
        name: '',
        host: 'imap.new.com',
        port: 993,
        username: 'new@test.com',
        password: 'newpassword',
        use_tls: true,
        default_post_process_action: 'do_nothing',
      }

      mockClient.post.mockRejectedValueOnce(new Error('HTTP 400: Bad Request'))

      await expect(accountsApi.create(createRequest)).rejects.toThrow('HTTP 400: Bad Request')
    })
  })

  describe('update', () => {
    it('updates existing account', async () => {
      const updateRequest: UpdateImapAccountRequest = {
        name: 'Updated Account',
        host: 'imap.updated.com',
        port: 993,
        username: 'updated@test.com',
        password: 'updatedpassword',
        use_tls: true,
      }

      const mockUpdatedAccount: ImapAccount = {
        id: '1',
        ...updateRequest,
        default_post_process_action: 'do_nothing',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z',
      }

      mockClient.put.mockResolvedValueOnce(mockUpdatedAccount)

      const result = await accountsApi.update('1', updateRequest)

      expect(mockClient.put).toHaveBeenCalledWith('/api/imap-accounts/1', updateRequest)
      expect(result).toEqual(mockUpdatedAccount)
    })

    it('handles not found on update', async () => {
      const updateRequest: UpdateImapAccountRequest = {
        name: 'Updated Account',
        host: 'imap.updated.com',
        port: 993,
        username: 'updated@test.com',
        password: 'updatedpassword',
        use_tls: true,
      }

      mockClient.put.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(accountsApi.update('999', updateRequest)).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('delete', () => {
    it('deletes account', async () => {
      mockClient.delete.mockResolvedValueOnce(null)

      await accountsApi.delete('1')

      expect(mockClient.delete).toHaveBeenCalledWith('/api/imap-accounts/1')
    })

    it('handles not found on delete', async () => {
      mockClient.delete.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(accountsApi.delete('999')).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('testConnection', () => {
    it('tests connection successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Connection successful',
      }

      mockClient.post.mockResolvedValueOnce(mockResult)

      const result = await accountsApi.testConnection('1')

      expect(mockClient.post).toHaveBeenCalledWith('/api/imap-accounts/1/test-connection')
      expect(result).toEqual(mockResult)
    })

    it('handles connection failure', async () => {
      const mockResult = {
        success: false,
        message: 'Connection failed: Invalid credentials',
      }

      mockClient.post.mockResolvedValueOnce(mockResult)

      const result = await accountsApi.testConnection('1')

      expect(result).toEqual(mockResult)
    })

    it('handles API error during connection test', async () => {
      mockClient.post.mockRejectedValueOnce(new Error('HTTP 500: Internal Server Error'))

      await expect(accountsApi.testConnection('1')).rejects.toThrow('HTTP 500: Internal Server Error')
    })
  })
})