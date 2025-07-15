import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import RuleForm from '../components/forms/RuleForm'
import { ToastProvider } from '../components/common/Toast'
import { AppProvider } from '../context/AppContext'
import { rulesApi } from '../api/rules'
import type { EmailRule, ImapAccount } from '../types'

// Mock the API
vi.mock('../api/rules', () => ({
  rulesApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

const mockAccounts: ImapAccount[] = [
  {
    id: 1,
    name: 'Test Account 1',
    host: 'imap.test1.com',
    port: 993,
    username: 'test1@test.com',
    password: 'password1',
    use_tls: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Test Account 2',
    host: 'imap.test2.com',
    port: 993,
    username: 'test2@test.com',
    password: 'password2',
    use_tls: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

const mockRule: EmailRule = {
  id: 1,
  name: 'Test Rule',
  imap_account_id: 1,
  from_pattern: 'test@example.com',
  subject_pattern: 'Test Subject',
  body_pattern: 'important',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AppProvider initialState={{ accounts: mockAccounts, rules: [], feeds: [], processing: false }}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  )
}

function renderRuleForm(props = {}) {
  return render(
    <TestWrapper>
      <RuleForm {...props} />
    </TestWrapper>
  )
}

describe('RuleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Mode', () => {
    it('renders create form correctly', () => {
      renderRuleForm()

      expect(screen.getByLabelText(/rule name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/imap account/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/from pattern/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/subject pattern/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/body pattern/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create rule/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('populates account dropdown', () => {
      renderRuleForm()

      const accountSelect = screen.getByLabelText(/imap account/i)
      expect(accountSelect).toBeInTheDocument()
      
      // Check that accounts are available as options
      expect(screen.getByText('Test Account 1')).toBeInTheDocument()
      expect(screen.getByText('Test Account 2')).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      renderRuleForm()

      const submitButton = screen.getByRole('button', { name: /create rule/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/rule name is required/i)).toBeInTheDocument()
      })
    })

    it('submits form with valid data', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      const mockCreatedRule: EmailRule = {
        id: 1,
        name: 'New Rule',
        imap_account_id: 1,
        from_pattern: 'test@example.com',
        subject_pattern: 'Test',
        body_pattern: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      vi.mocked(rulesApi.create).mockResolvedValueOnce(mockCreatedRule)

      renderRuleForm({ onSubmit: mockOnSubmit })

      // Fill out form
      await user.type(screen.getByLabelText(/rule name/i), 'New Rule')
      await user.selectOptions(screen.getByLabelText(/imap account/i), '1')
      await user.type(screen.getByLabelText(/from pattern/i), 'test@example.com')
      await user.type(screen.getByLabelText(/subject pattern/i), 'Test')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create rule/i }))

      await waitFor(() => {
        expect(rulesApi.create).toHaveBeenCalledWith({
          name: 'New Rule',
          imap_account_id: 1,
          from_pattern: 'test@example.com',
          subject_pattern: 'Test',
          body_pattern: null,
        })
        expect(mockOnSubmit).toHaveBeenCalledWith(mockCreatedRule)
      })
    })

    it('handles API error on create', async () => {
      const user = userEvent.setup()
      
      vi.mocked(rulesApi.create).mockRejectedValueOnce(new Error('API Error'))

      renderRuleForm()

      // Fill out form
      await user.type(screen.getByLabelText(/rule name/i), 'New Rule')
      await user.selectOptions(screen.getByLabelText(/imap account/i), '1')
      await user.type(screen.getByLabelText(/from pattern/i), 'test@example.com')
      await user.type(screen.getByLabelText(/subject pattern/i), 'Test')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create rule/i }))

      await waitFor(() => {
        expect(screen.getByText(/api error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode', () => {
    it('renders edit form with existing data', () => {
      renderRuleForm({ rule: mockRule })

      expect(screen.getByDisplayValue('Test Rule')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Subject')).toBeInTheDocument()
      expect(screen.getByDisplayValue('important')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update rule/i })).toBeInTheDocument()
    })

    it('submits update with modified data', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      const mockUpdatedRule: EmailRule = {
        ...mockRule,
        name: 'Updated Rule',
        from_pattern: 'updated@example.com',
      }

      vi.mocked(rulesApi.update).mockResolvedValueOnce(mockUpdatedRule)

      renderRuleForm({ rule: mockRule, onSubmit: mockOnSubmit })

      // Modify form
      const nameInput = screen.getByDisplayValue('Test Rule')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Rule')

      const fromInput = screen.getByDisplayValue('test@example.com')
      await user.clear(fromInput)
      await user.type(fromInput, 'updated@example.com')

      // Submit form
      await user.click(screen.getByRole('button', { name: /update rule/i }))

      await waitFor(() => {
        expect(rulesApi.update).toHaveBeenCalledWith(1, {
          name: 'Updated Rule',
          imap_account_id: 1,
          from_pattern: 'updated@example.com',
          subject_pattern: 'Test Subject',
          body_pattern: 'important',
        })
        expect(mockOnSubmit).toHaveBeenCalledWith(mockUpdatedRule)
      })
    })

    it('handles API error on update', async () => {
      const user = userEvent.setup()
      
      vi.mocked(rulesApi.update).mockRejectedValueOnce(new Error('Update failed'))

      renderRuleForm({ rule: mockRule })

      const nameInput = screen.getByDisplayValue('Test Rule')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Rule')

      await user.click(screen.getByRole('button', { name: /update rule/i }))

      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('validates rule name is required', async () => {
      const user = userEvent.setup()
      renderRuleForm()

      const submitButton = screen.getByRole('button', { name: /create rule/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/rule name is required/i)).toBeInTheDocument()
      })
    })

    it('validates IMAP account is selected', async () => {
      const user = userEvent.setup()
      renderRuleForm()

      await user.type(screen.getByLabelText(/rule name/i), 'Test Rule')
      
      const submitButton = screen.getByRole('button', { name: /create rule/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/imap account is required/i)).toBeInTheDocument()
      })
    })

    it('validates at least one pattern is provided', async () => {
      const user = userEvent.setup()
      renderRuleForm()

      await user.type(screen.getByLabelText(/rule name/i), 'Test Rule')
      await user.selectOptions(screen.getByLabelText(/imap account/i), '1')
      
      const submitButton = screen.getByRole('button', { name: /create rule/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/at least one pattern is required/i)).toBeInTheDocument()
      })
    })

    it('clears errors when user starts typing', async () => {
      const user = userEvent.setup()
      renderRuleForm()

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /create rule/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/rule name is required/i)).toBeInTheDocument()
      })

      // Start typing to clear error
      await user.type(screen.getByLabelText(/rule name/i), 'T')

      await waitFor(() => {
        expect(screen.queryByText(/rule name is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Cancel Button', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnCancel = vi.fn()
      
      renderRuleForm({ onCancel: mockOnCancel })

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      // Mock API call to be slow
      vi.mocked(rulesApi.create).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockRule), 1000))
      )

      renderRuleForm()

      // Fill out form
      await user.type(screen.getByLabelText(/rule name/i), 'New Rule')
      await user.selectOptions(screen.getByLabelText(/imap account/i), '1')
      await user.type(screen.getByLabelText(/from pattern/i), 'test@example.com')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create rule/i }))

      // Check loading state
      expect(screen.getByText(/creating\.\.\./i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /creating\.\.\./i })).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      renderRuleForm()

      const nameInput = screen.getByLabelText(/rule name/i)
      expect(nameInput).toHaveAttribute('aria-describedby')
      expect(nameInput).toHaveAttribute('required')

      const accountSelect = screen.getByLabelText(/imap account/i)
      expect(accountSelect).toHaveAttribute('aria-describedby')
      expect(accountSelect).toHaveAttribute('required')

      const fromInput = screen.getByLabelText(/from pattern/i)
      expect(fromInput).toHaveAttribute('aria-describedby')

      const subjectInput = screen.getByLabelText(/subject pattern/i)
      expect(subjectInput).toHaveAttribute('aria-describedby')

      const bodyInput = screen.getByLabelText(/body pattern/i)
      expect(bodyInput).toHaveAttribute('aria-describedby')
    })

    it('shows error messages with proper ARIA attributes', async () => {
      const user = userEvent.setup()
      renderRuleForm()

      const submitButton = screen.getByRole('button', { name: /create rule/i })
      await user.click(submitButton)

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/rule name/i)
        expect(nameInput).toHaveAttribute('aria-invalid', 'true')
        
        const errorMessage = screen.getByText(/rule name is required/i)
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })
  })
})