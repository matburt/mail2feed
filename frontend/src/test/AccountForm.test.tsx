import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import AccountForm from '../components/forms/AccountForm'
import { ToastProvider } from '../components/common/Toast'
import { accountsApi } from '../api/accounts'
import type { ImapAccount } from '../types'

// Mock the API
vi.mock('../api/accounts', () => ({
  accountsApi: {
    create: vi.fn(),
    update: vi.fn(),
    testConnection: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockAccount: ImapAccount = {
  id: '123',
  name: 'Test Account',
  host: 'imap.test.com',
  port: 993,
  username: 'test@example.com',
  password: 'password123',
  use_tls: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  default_post_process_action: 'do_nothing',
}

const renderAccountForm = (props = {}) => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AccountForm {...props} />
      </ToastProvider>
    </BrowserRouter>
  )
}

describe('AccountForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create form correctly', () => {
    renderAccountForm()
    
    expect(screen.getByLabelText(/account name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/imap host/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/port/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/use tls/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument()
  })

  it('renders edit form with existing data', () => {
    renderAccountForm({ account: mockAccount })
    
    expect(screen.getByDisplayValue('Test Account')).toBeInTheDocument()
    expect(screen.getByDisplayValue('imap.test.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('993')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('password123')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update account/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderAccountForm()
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/account name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/host is required/i)).toBeInTheDocument()
    expect(screen.getByText(/username is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('validates port range', async () => {
    const user = userEvent.setup()
    renderAccountForm()
    
    const portInput = screen.getByLabelText(/port/i)
    await user.clear(portInput)
    await user.type(portInput, '99999')
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/port must be between 1 and 65535/i)).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const mockCreatedAccount = { ...mockAccount, id: 'new-id' }
    
    vi.mocked(accountsApi.create).mockResolvedValue(mockCreatedAccount)
    
    renderAccountForm({ onSubmit })
    
    await user.type(screen.getByLabelText(/account name/i), 'New Account')
    await user.type(screen.getByLabelText(/imap host/i), 'imap.example.com')
    await user.clear(screen.getByLabelText(/port/i))
    await user.type(screen.getByLabelText(/port/i), '993')
    await user.type(screen.getByLabelText(/username/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(accountsApi.create).toHaveBeenCalledWith({
        name: 'New Account',
        host: 'imap.example.com',
        port: 993,
        username: 'user@example.com',
        password: 'secret123',
        use_tls: true,
      })
    })
    
    expect(onSubmit).toHaveBeenCalledWith(mockCreatedAccount)
  })

  it('tests connection successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(accountsApi.create).mockResolvedValue(mockAccount)
    vi.mocked(accountsApi.testConnection).mockResolvedValue({
      success: true,
      message: 'Connection successful'
    })
    
    renderAccountForm()
    
    // Fill in valid form data
    await user.type(screen.getByLabelText(/account name/i), 'Test Account')
    await user.type(screen.getByLabelText(/imap host/i), 'imap.test.com')
    await user.type(screen.getByLabelText(/username/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    
    const testButton = screen.getByRole('button', { name: /test connection/i })
    await user.click(testButton)
    
    await waitFor(() => {
      expect(screen.getByText(/connection successful/i)).toBeInTheDocument()
    })
  })

  it('handles connection test failure', async () => {
    const user = userEvent.setup()
    vi.mocked(accountsApi.create).mockResolvedValue(mockAccount)
    vi.mocked(accountsApi.testConnection).mockResolvedValue({
      success: false,
      message: 'Invalid credentials'
    })
    vi.mocked(accountsApi.delete).mockResolvedValue()
    
    renderAccountForm()
    
    // Fill in valid form data
    await user.type(screen.getByLabelText(/account name/i), 'Test Account')
    await user.type(screen.getByLabelText(/imap host/i), 'imap.test.com')
    await user.type(screen.getByLabelText(/username/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong-password')
    
    const testButton = screen.getByRole('button', { name: /test connection/i })
    await user.click(testButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    
    // Should delete the temporary account
    expect(accountsApi.delete).toHaveBeenCalledWith(mockAccount.id)
  })

  it('clears errors when user starts typing', async () => {
    const user = userEvent.setup()
    renderAccountForm()
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/account name is required/i)).toBeInTheDocument()
    
    const nameInput = screen.getByLabelText(/account name/i)
    await user.type(nameInput, 'Test')
    
    expect(screen.queryByText(/account name is required/i)).not.toBeInTheDocument()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    vi.mocked(accountsApi.create).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockAccount), 100))
    )
    
    renderAccountForm()
    
    // Fill in valid form data
    await user.type(screen.getByLabelText(/account name/i), 'Test Account')
    await user.type(screen.getByLabelText(/imap host/i), 'imap.test.com')
    await user.type(screen.getByLabelText(/username/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)
    
    expect(screen.getByRole('button', { name: /creating\.\.\./i })).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })
})