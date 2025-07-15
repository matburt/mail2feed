import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Accounts from '../pages/Accounts'
import { AppProvider } from '../context/AppContext'
import { ToastProvider } from '../components/common/Toast'
import { accountsApi } from '../api/accounts'
import type { ImapAccount } from '../types'

// Mock the API
vi.mock('../api/accounts', () => ({
  accountsApi: {
    getAll: vi.fn(),
    testConnection: vi.fn(),
    delete: vi.fn(),
    processEmails: vi.fn(),
  },
}))

const mockAccounts: ImapAccount[] = [
  {
    id: '1',
    name: 'Gmail Account',
    host: 'imap.gmail.com',
    port: 993,
    username: 'user@gmail.com',
    password: 'password',
    use_tls: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Outlook Account',
    host: 'outlook.office365.com',
    port: 993,
    username: 'user@outlook.com',
    password: 'password',
    use_tls: true,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  },
]

const renderAccounts = () => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <Accounts />
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

// Mock window.confirm
const mockConfirm = vi.fn()
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
})

describe('Accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockReturnValue(true)
  })

  it('shows loading state initially', () => {
    vi.mocked(accountsApi.getAll).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )
    
    renderAccounts()
    
    expect(screen.getByText(/loading accounts\.\.\./i)).toBeInTheDocument()
    expect(screen.getAllByTestId(/loading-skeleton|animate-pulse/)).toBeTruthy()
  })

  it('displays accounts list', async () => {
    vi.mocked(accountsApi.getAll).mockResolvedValue(mockAccounts)
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getByText('Gmail Account')).toBeInTheDocument()
      expect(screen.getByText('Outlook Account')).toBeInTheDocument()
      expect(screen.getByText('user@gmail.com@imap.gmail.com:993')).toBeInTheDocument()
      expect(screen.getByText('user@outlook.com@outlook.office365.com:993')).toBeInTheDocument()
    })
  })

  it('shows empty state when no accounts', async () => {
    vi.mocked(accountsApi.getAll).mockResolvedValue([])
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getByText(/no imap accounts/i)).toBeInTheDocument()
      expect(screen.getByText(/get started by adding your first email server connection/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /add imap account/i })).toBeInTheDocument()
    })
  })

  it('tests connection successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(accountsApi.getAll).mockResolvedValue(mockAccounts)
    vi.mocked(accountsApi.testConnection).mockResolvedValue({
      success: true,
      message: 'Connection successful'
    })
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getByText('Gmail Account')).toBeInTheDocument()
    })
    
    const testButtons = screen.getAllByRole('button', { name: /test/i })
    await user.click(testButtons[0])
    
    await waitFor(() => {
      expect(accountsApi.testConnection).toHaveBeenCalledWith('1')
      expect(screen.getByText(/✓ connected/i)).toBeInTheDocument()
    })
  })

  it('handles connection test failure', async () => {
    const user = userEvent.setup()
    vi.mocked(accountsApi.getAll).mockResolvedValue(mockAccounts)
    vi.mocked(accountsApi.testConnection).mockResolvedValue({
      success: false,
      message: 'Authentication failed'
    })
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getByText('Gmail Account')).toBeInTheDocument()
    })
    
    const testButtons = screen.getAllByRole('button', { name: /test/i })
    await user.click(testButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText(/✗ failed/i)).toBeInTheDocument()
      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })
  })

  it('deletes account with confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(accountsApi.getAll).mockResolvedValue(mockAccounts)
    vi.mocked(accountsApi.delete).mockResolvedValue()
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getByText('Gmail Account')).toBeInTheDocument()
    })
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])
    
    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this account? This will also delete all associated rules and feeds.'
    )
    
    await waitFor(() => {
      expect(accountsApi.delete).toHaveBeenCalledWith('1')
    })
  })

  it('cancels delete when not confirmed', async () => {
    const user = userEvent.setup()
    mockConfirm.mockReturnValue(false)
    vi.mocked(accountsApi.getAll).mockResolvedValue(mockAccounts)
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getByText('Gmail Account')).toBeInTheDocument()
    })
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])
    
    expect(mockConfirm).toHaveBeenCalled()
    expect(accountsApi.delete).not.toHaveBeenCalled()
  })

  it('processes account emails', async () => {
    const user = userEvent.setup()
    vi.mocked(accountsApi.getAll).mockResolvedValue(mockAccounts)
    vi.mocked(accountsApi.processEmails).mockResolvedValue({ message: 'Processing started' })
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getByText('Gmail Account')).toBeInTheDocument()
    })
    
    const processButtons = screen.getAllByRole('button', { name: /process/i })
    await user.click(processButtons[0])
    
    await waitFor(() => {
      expect(accountsApi.processEmails).toHaveBeenCalledWith('1')
    })
  })

  it('shows TLS indicator for secure connections', async () => {
    vi.mocked(accountsApi.getAll).mockResolvedValue(mockAccounts)
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getAllByText('TLS')).toHaveLength(2)
    })
  })

  it('displays connection status indicators', async () => {
    const user = userEvent.setup()
    vi.mocked(accountsApi.getAll).mockResolvedValue(mockAccounts)
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getAllByText(/not tested/i)).toHaveLength(2)
    })
    
    // Test one connection
    vi.mocked(accountsApi.testConnection).mockResolvedValue({
      success: true,
      message: 'Connected'
    })
    
    const testButtons = screen.getAllByRole('button', { name: /test/i })
    await user.click(testButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText(/✓ connected/i)).toBeInTheDocument()
      expect(screen.getByText(/not tested/i)).toBeInTheDocument() // Second account still not tested
    })
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(accountsApi.getAll).mockRejectedValue(new Error('Network error'))
    
    renderAccounts()
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })
})