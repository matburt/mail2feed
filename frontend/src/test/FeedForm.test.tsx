import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import FeedForm from '../components/forms/FeedForm'
import { ToastProvider } from '../components/common/Toast'
import { AppProvider } from '../context/AppContext'
import { feedsApi } from '../api/feeds'
import type { Feed, EmailRule } from '../types'

// Mock the API
vi.mock('../api/feeds', () => ({
  feedsApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

const mockRules: EmailRule[] = [
  {
    id: 1,
    name: 'Test Rule 1',
    imap_account_id: 1,
    from_pattern: 'test1@example.com',
    subject_pattern: 'Test Subject 1',
    body_pattern: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Test Rule 2',
    imap_account_id: 1,
    from_pattern: 'test2@example.com',
    subject_pattern: 'Test Subject 2',
    body_pattern: 'important',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

const mockFeed: Feed = {
  id: 1,
  name: 'Test Feed',
  email_rule_id: 1,
  feed_type: 'rss',
  description: 'Test Description',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AppProvider initialState={{ accounts: [], rules: mockRules, feeds: [], processing: false }}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  )
}

function renderFeedForm(props = {}) {
  return render(
    <TestWrapper>
      <FeedForm {...props} />
    </TestWrapper>
  )
}

describe('FeedForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Mode', () => {
    it('renders create form correctly', () => {
      renderFeedForm()

      expect(screen.getByLabelText(/feed name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email rule/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/feed type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create feed/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('populates rule dropdown', () => {
      renderFeedForm()

      const ruleSelect = screen.getByLabelText(/email rule/i)
      expect(ruleSelect).toBeInTheDocument()
      
      // Check that rules are available as options
      expect(screen.getByText('Test Rule 1')).toBeInTheDocument()
      expect(screen.getByText('Test Rule 2')).toBeInTheDocument()
    })

    it('shows feed type options', () => {
      renderFeedForm()

      const feedTypeSelect = screen.getByLabelText(/feed type/i)
      expect(feedTypeSelect).toBeInTheDocument()
      
      // Check that feed types are available
      expect(screen.getByText('RSS')).toBeInTheDocument()
      expect(screen.getByText('Atom')).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      renderFeedForm()

      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/feed name is required/i)).toBeInTheDocument()
      })
    })

    it('submits form with valid data', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      const mockCreatedFeed: Feed = {
        id: 1,
        name: 'New Feed',
        email_rule_id: 1,
        feed_type: 'rss',
        description: 'New Description',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      vi.mocked(feedsApi.create).mockResolvedValueOnce(mockCreatedFeed)

      renderFeedForm({ onSubmit: mockOnSubmit })

      // Fill out form
      await user.type(screen.getByLabelText(/feed name/i), 'New Feed')
      await user.selectOptions(screen.getByLabelText(/email rule/i), '1')
      await user.selectOptions(screen.getByLabelText(/feed type/i), 'rss')
      await user.type(screen.getByLabelText(/description/i), 'New Description')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create feed/i }))

      await waitFor(() => {
        expect(feedsApi.create).toHaveBeenCalledWith({
          name: 'New Feed',
          email_rule_id: 1,
          feed_type: 'rss',
          description: 'New Description',
        })
        expect(mockOnSubmit).toHaveBeenCalledWith(mockCreatedFeed)
      })
    })

    it('submits form with Atom feed type', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      const mockCreatedFeed: Feed = {
        id: 1,
        name: 'New Atom Feed',
        email_rule_id: 1,
        feed_type: 'atom',
        description: 'New Atom Description',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      vi.mocked(feedsApi.create).mockResolvedValueOnce(mockCreatedFeed)

      renderFeedForm({ onSubmit: mockOnSubmit })

      // Fill out form
      await user.type(screen.getByLabelText(/feed name/i), 'New Atom Feed')
      await user.selectOptions(screen.getByLabelText(/email rule/i), '1')
      await user.selectOptions(screen.getByLabelText(/feed type/i), 'atom')
      await user.type(screen.getByLabelText(/description/i), 'New Atom Description')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create feed/i }))

      await waitFor(() => {
        expect(feedsApi.create).toHaveBeenCalledWith({
          name: 'New Atom Feed',
          email_rule_id: 1,
          feed_type: 'atom',
          description: 'New Atom Description',
        })
        expect(mockOnSubmit).toHaveBeenCalledWith(mockCreatedFeed)
      })
    })

    it('handles API error on create', async () => {
      const user = userEvent.setup()
      
      vi.mocked(feedsApi.create).mockRejectedValueOnce(new Error('API Error'))

      renderFeedForm()

      // Fill out form
      await user.type(screen.getByLabelText(/feed name/i), 'New Feed')
      await user.selectOptions(screen.getByLabelText(/email rule/i), '1')
      await user.selectOptions(screen.getByLabelText(/feed type/i), 'rss')
      await user.type(screen.getByLabelText(/description/i), 'New Description')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create feed/i }))

      await waitFor(() => {
        expect(screen.getByText(/api error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode', () => {
    it('renders edit form with existing data', () => {
      renderFeedForm({ feed: mockFeed })

      expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update feed/i })).toBeInTheDocument()
      
      // Check that RSS is selected
      const feedTypeSelect = screen.getByLabelText(/feed type/i) as HTMLSelectElement
      expect(feedTypeSelect.value).toBe('rss')
    })

    it('submits update with modified data', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      const mockUpdatedFeed: Feed = {
        ...mockFeed,
        name: 'Updated Feed',
        feed_type: 'atom',
        description: 'Updated Description',
      }

      vi.mocked(feedsApi.update).mockResolvedValueOnce(mockUpdatedFeed)

      renderFeedForm({ feed: mockFeed, onSubmit: mockOnSubmit })

      // Modify form
      const nameInput = screen.getByDisplayValue('Test Feed')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Feed')

      await user.selectOptions(screen.getByLabelText(/feed type/i), 'atom')

      const descriptionInput = screen.getByDisplayValue('Test Description')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated Description')

      // Submit form
      await user.click(screen.getByRole('button', { name: /update feed/i }))

      await waitFor(() => {
        expect(feedsApi.update).toHaveBeenCalledWith(1, {
          name: 'Updated Feed',
          email_rule_id: 1,
          feed_type: 'atom',
          description: 'Updated Description',
        })
        expect(mockOnSubmit).toHaveBeenCalledWith(mockUpdatedFeed)
      })
    })

    it('handles API error on update', async () => {
      const user = userEvent.setup()
      
      vi.mocked(feedsApi.update).mockRejectedValueOnce(new Error('Update failed'))

      renderFeedForm({ feed: mockFeed })

      const nameInput = screen.getByDisplayValue('Test Feed')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Feed')

      await user.click(screen.getByRole('button', { name: /update feed/i }))

      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('validates feed name is required', async () => {
      const user = userEvent.setup()
      renderFeedForm()

      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/feed name is required/i)).toBeInTheDocument()
      })
    })

    it('validates email rule is selected', async () => {
      const user = userEvent.setup()
      renderFeedForm()

      await user.type(screen.getByLabelText(/feed name/i), 'Test Feed')
      
      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email rule is required/i)).toBeInTheDocument()
      })
    })

    it('validates feed type is selected', async () => {
      const user = userEvent.setup()
      renderFeedForm()

      await user.type(screen.getByLabelText(/feed name/i), 'Test Feed')
      await user.selectOptions(screen.getByLabelText(/email rule/i), '1')
      
      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/feed type is required/i)).toBeInTheDocument()
      })
    })

    it('clears errors when user starts typing', async () => {
      const user = userEvent.setup()
      renderFeedForm()

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/feed name is required/i)).toBeInTheDocument()
      })

      // Start typing to clear error
      await user.type(screen.getByLabelText(/feed name/i), 'T')

      await waitFor(() => {
        expect(screen.queryByText(/feed name is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Cancel Button', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnCancel = vi.fn()
      
      renderFeedForm({ onCancel: mockOnCancel })

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      
      // Mock API call to be slow
      vi.mocked(feedsApi.create).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockFeed), 1000))
      )

      renderFeedForm()

      // Fill out form
      await user.type(screen.getByLabelText(/feed name/i), 'New Feed')
      await user.selectOptions(screen.getByLabelText(/email rule/i), '1')
      await user.selectOptions(screen.getByLabelText(/feed type/i), 'rss')
      await user.type(screen.getByLabelText(/description/i), 'New Description')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create feed/i }))

      // Check loading state
      expect(screen.getByText(/creating\.\.\./i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /creating\.\.\./i })).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      renderFeedForm()

      const nameInput = screen.getByLabelText(/feed name/i)
      expect(nameInput).toHaveAttribute('aria-describedby')
      expect(nameInput).toHaveAttribute('required')

      const ruleSelect = screen.getByLabelText(/email rule/i)
      expect(ruleSelect).toHaveAttribute('aria-describedby')
      expect(ruleSelect).toHaveAttribute('required')

      const typeSelect = screen.getByLabelText(/feed type/i)
      expect(typeSelect).toHaveAttribute('aria-describedby')
      expect(typeSelect).toHaveAttribute('required')

      const descriptionInput = screen.getByLabelText(/description/i)
      expect(descriptionInput).toHaveAttribute('aria-describedby')
    })

    it('shows error messages with proper ARIA attributes', async () => {
      const user = userEvent.setup()
      renderFeedForm()

      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/feed name/i)
        expect(nameInput).toHaveAttribute('aria-invalid', 'true')
        
        const errorMessage = screen.getByText(/feed name is required/i)
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })
  })
})