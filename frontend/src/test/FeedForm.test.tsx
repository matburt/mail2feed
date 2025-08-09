import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import FeedForm from '../components/forms/FeedForm'
import { ToastProvider } from '../components/common/Toast'
import { AppProvider } from '../context/AppContext'
import { feedsApi } from '../api/feeds'
import { rulesApi } from '../api/rules'
import type { Feed, EmailRule } from '../types'

// Mock the APIs
vi.mock('../api/feeds', () => ({
  feedsApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../api/rules', () => ({
  rulesApi: {
    getAll: vi.fn(),
  },
}))

const mockRules: EmailRule[] = [
  {
    id: 'rule-1',
    name: 'Test Rule 1',
    imap_account_id: 'account-1',
    folder: 'INBOX',
    to_address: 'test1@example.com',
    from_address: null,
    subject_contains: null,
    label: null,
    is_active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'rule-2',
    name: 'Test Rule 2',
    imap_account_id: 'account-1',
    folder: 'INBOX',
    to_address: 'test2@example.com',
    from_address: null,
    subject_contains: 'important',
    label: null,
    is_active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

const mockFeed: Feed = {
  id: 'feed-1',
  title: 'Test Feed',
  email_rule_id: 'rule-1',
  feed_type: 'rss',
  description: 'Test Description',
  link: 'https://example.com',
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  max_items: 100,
  max_age_days: 30,
  min_items: 10,
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

async function renderFeedForm(props = {}) {
  const result = render(
    <TestWrapper>
      <FeedForm {...props} />
    </TestWrapper>
  )
  
  // Wait for the rules to load
  await waitFor(() => {
    // Check if the form is rendered (not the "No email rules" message)
    expect(screen.queryByText(/No email rules/)).not.toBeInTheDocument()
  })
  
  return result
}

describe('FeedForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock the rules API to return our mock rules
    vi.mocked(rulesApi.getAll).mockResolvedValue(mockRules)
  })

  describe('Create Mode', () => {
    it('renders create form correctly', async () => {
      await renderFeedForm()

      expect(screen.getByLabelText(/feed title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/feed description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/feed link/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email rule/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/feed type/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create feed/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('populates rule dropdown', async () => {
      await renderFeedForm()

      const ruleSelect = screen.getByLabelText(/email rule/i)
      expect(ruleSelect).toBeInTheDocument()
      
      // Check that rules are available as options
      expect(screen.getByText('Test Rule 1')).toBeInTheDocument()
      expect(screen.getByText('Test Rule 2')).toBeInTheDocument()
    })

    it('shows feed type options', async () => {
      await renderFeedForm()

      const feedTypeSelect = screen.getByLabelText(/feed type/i)
      expect(feedTypeSelect).toBeInTheDocument()
      
      // Check that feed types are available
      expect(screen.getByText('RSS 2.0')).toBeInTheDocument()
      expect(screen.getByText('Atom 1.0')).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      await renderFeedForm()

      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/feed title is required/i)).toBeInTheDocument()
        expect(screen.getByText(/feed description is required/i)).toBeInTheDocument()
        expect(screen.getByText(/feed link is required/i)).toBeInTheDocument()
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

  describe('Retention Policy', () => {
    it('renders retention policy fields with default values', () => {
      renderFeedForm()

      // Check section header
      expect(screen.getByText('Feed Retention Policy')).toBeInTheDocument()

      // Check retention fields with default values
      expect(screen.getByLabelText(/max items/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/max age \(days\)/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/min items/i)).toBeInTheDocument()

      // Check default values
      expect(screen.getByDisplayValue('100')).toBeInTheDocument() // max_items
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()  // max_age_days
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()  // min_items
    })

    it('renders retention policy fields with feed values in edit mode', () => {
      const feedWithCustomRetention = {
        ...mockFeed,
        max_items: 75,
        max_age_days: 21,
        min_items: 8,
      }
      
      renderFeedForm({ feed: feedWithCustomRetention })

      // Check custom values are displayed
      expect(screen.getByDisplayValue('75')).toBeInTheDocument()  // max_items
      expect(screen.getByDisplayValue('21')).toBeInTheDocument()  // max_age_days
      expect(screen.getByDisplayValue('8')).toBeInTheDocument()   // min_items
    })

    it('validates retention policy constraints', async () => {
      const user = userEvent.setup()
      renderFeedForm()

      // Test max_items validation (must be > 0)
      const maxItemsInput = screen.getByLabelText(/max items/i)
      await user.clear(maxItemsInput)
      await user.type(maxItemsInput, '0')

      // Test max_age_days validation (must be > 0)
      const maxAgeDaysInput = screen.getByLabelText(/max age \(days\)/i)
      await user.clear(maxAgeDaysInput)
      await user.type(maxAgeDaysInput, '0')

      // Test min_items validation (cannot be negative)
      const minItemsInput = screen.getByLabelText(/min items/i)
      await user.clear(minItemsInput)
      await user.type(minItemsInput, '-1')

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      // Check validation errors
      await waitFor(() => {
        expect(screen.getByText(/max items must be greater than 0/i)).toBeInTheDocument()
        expect(screen.getByText(/max age must be greater than 0/i)).toBeInTheDocument()
        expect(screen.getByText(/min items cannot be negative/i)).toBeInTheDocument()
      })
    })

    it('validates min_items cannot exceed max_items', async () => {
      const user = userEvent.setup()
      renderFeedForm()

      // Set min_items > max_items
      const maxItemsInput = screen.getByLabelText(/max items/i)
      const minItemsInput = screen.getByLabelText(/min items/i)
      
      await user.clear(maxItemsInput)
      await user.type(maxItemsInput, '50')
      
      await user.clear(minItemsInput)
      await user.type(minItemsInput, '75')

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      // Check validation error
      await waitFor(() => {
        expect(screen.getByText(/min items cannot exceed max items/i)).toBeInTheDocument()
      })
    })

    it('includes retention policy fields in create request', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      const mockCreatedFeed: Feed = {
        id: 'new-feed',
        title: 'Custom Retention Feed',
        email_rule_id: 'rule-1',
        feed_type: 'rss',
        description: 'Custom retention description',
        link: 'https://example.com/custom',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        max_items: 75,
        max_age_days: 14,
        min_items: 5,
      }

      vi.mocked(feedsApi.create).mockResolvedValueOnce(mockCreatedFeed)

      renderFeedForm({ onSubmit: mockOnSubmit })

      // Fill out form with custom retention values
      await user.type(screen.getByLabelText(/feed title/i), 'Custom Retention Feed')
      await user.type(screen.getByLabelText(/feed description/i), 'Custom retention description')
      await user.type(screen.getByLabelText(/feed link/i), 'https://example.com/custom')
      await user.selectOptions(screen.getByLabelText(/email rule/i), 'rule-1')

      // Set custom retention values
      const maxItemsInput = screen.getByLabelText(/max items/i)
      const maxAgeDaysInput = screen.getByLabelText(/max age \(days\)/i)
      const minItemsInput = screen.getByLabelText(/min items/i)
      
      await user.clear(maxItemsInput)
      await user.type(maxItemsInput, '75')
      
      await user.clear(maxAgeDaysInput)
      await user.type(maxAgeDaysInput, '14')
      
      await user.clear(minItemsInput)
      await user.type(minItemsInput, '5')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create feed/i }))

      await waitFor(() => {
        expect(feedsApi.create).toHaveBeenCalledWith({
          title: 'Custom Retention Feed',
          description: 'Custom retention description',
          link: 'https://example.com/custom',
          email_rule_id: 'rule-1',
          feed_type: 'rss',
          is_active: true,
          max_items: 75,
          max_age_days: 14,
          min_items: 5,
        })
        expect(mockOnSubmit).toHaveBeenCalledWith(mockCreatedFeed)
      })
    })

    it('includes retention policy fields in update request', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      const mockUpdatedFeed: Feed = {
        ...mockFeed,
        max_items: 200,
        max_age_days: 60,
        min_items: 20,
      }

      vi.mocked(feedsApi.update).mockResolvedValueOnce(mockUpdatedFeed)

      renderFeedForm({ feed: mockFeed, onSubmit: mockOnSubmit })

      // Modify retention values
      const maxItemsInput = screen.getByDisplayValue('100')
      const maxAgeDaysInput = screen.getByDisplayValue('30')
      const minItemsInput = screen.getByDisplayValue('10')
      
      await user.clear(maxItemsInput)
      await user.type(maxItemsInput, '200')
      
      await user.clear(maxAgeDaysInput)
      await user.type(maxAgeDaysInput, '60')
      
      await user.clear(minItemsInput)
      await user.type(minItemsInput, '20')

      // Submit form
      await user.click(screen.getByRole('button', { name: /update feed/i }))

      await waitFor(() => {
        expect(feedsApi.update).toHaveBeenCalledWith('feed-1', {
          title: 'Test Feed',
          description: 'Test Description',
          link: 'https://example.com',
          email_rule_id: 'rule-1',
          feed_type: 'rss',
          is_active: true,
          max_items: 200,
          max_age_days: 60,
          min_items: 20,
        })
        expect(mockOnSubmit).toHaveBeenCalledWith(mockUpdatedFeed)
      })
    })

    it('handles undefined retention values gracefully', () => {
      const feedWithoutRetention = {
        ...mockFeed,
        max_items: undefined,
        max_age_days: undefined,
        min_items: undefined,
      }
      
      renderFeedForm({ feed: feedWithoutRetention })

      // Should fall back to default values
      expect(screen.getByDisplayValue('100')).toBeInTheDocument() // max_items default
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()  // max_age_days default
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()  // min_items default
    })

    it('clears retention policy validation errors when user corrects input', async () => {
      const user = userEvent.setup()
      renderFeedForm()

      const maxItemsInput = screen.getByLabelText(/max items/i)
      
      // Set invalid value to trigger error
      await user.clear(maxItemsInput)
      await user.type(maxItemsInput, '0')
      
      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      // Check error appears
      await waitFor(() => {
        expect(screen.getByText(/max items must be greater than 0/i)).toBeInTheDocument()
      })

      // Fix the value
      await user.clear(maxItemsInput)
      await user.type(maxItemsInput, '50')

      // Error should disappear
      await waitFor(() => {
        expect(screen.queryByText(/max items must be greater than 0/i)).not.toBeInTheDocument()
      })
    })
  })
})