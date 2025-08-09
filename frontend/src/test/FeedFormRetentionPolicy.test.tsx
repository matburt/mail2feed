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
      <AppProvider initialState={{ accounts: [], rules: mockRules, feeds: [], processing: null, loading: false, error: null }}>
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
  
  // Wait for the form to load
  await waitFor(() => {
    expect(screen.getByLabelText(/feed title/i)).toBeInTheDocument()
  })
  
  return result
}

describe('FeedForm - Retention Policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rulesApi.getAll).mockResolvedValue(mockRules)
  })

  describe('Retention Policy Fields', () => {
    it('renders retention policy section with default values', async () => {
      await renderFeedForm()

      // Check section header
      expect(screen.getByText('Feed Retention Policy')).toBeInTheDocument()
      expect(screen.getByText(/Configure how long feed items are kept/)).toBeInTheDocument()

      // Check retention fields exist
      expect(screen.getByLabelText(/max items/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/max age \(days\)/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/min items/i)).toBeInTheDocument()

      // Check default values (100, 30, 10)
      expect(screen.getByDisplayValue('100')).toBeInTheDocument() // max_items
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()  // max_age_days
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()  // min_items

      // Check help text
      expect(screen.getByText(/Maximum number of items to keep/)).toBeInTheDocument()
      expect(screen.getByText(/Maximum age in days before items are removed/)).toBeInTheDocument()
      expect(screen.getByText(/Minimum items to always keep/)).toBeInTheDocument()
    })

    it('displays custom retention values in edit mode', async () => {
      const feedWithCustomRetention = {
        ...mockFeed,
        max_items: 75,
        max_age_days: 21,
        min_items: 8,
      }
      
      await renderFeedForm({ feed: feedWithCustomRetention })

      // Check custom values are displayed
      expect(screen.getByDisplayValue('75')).toBeInTheDocument()  // max_items
      expect(screen.getByDisplayValue('21')).toBeInTheDocument()  // max_age_days
      expect(screen.getByDisplayValue('8')).toBeInTheDocument()   // min_items
    })

    it('falls back to defaults for undefined retention values', async () => {
      const feedWithoutRetention = {
        ...mockFeed,
        max_items: undefined,
        max_age_days: undefined,
        min_items: undefined,
      }
      
      await renderFeedForm({ feed: feedWithoutRetention })

      // Should fall back to default values
      expect(screen.getByDisplayValue('100')).toBeInTheDocument() // max_items default
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()  // max_age_days default
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()  // min_items default
    })
  })

  describe('Retention Policy Validation', () => {
    it('validates max_items must be greater than 0', async () => {
      const user = userEvent.setup()
      await renderFeedForm()

      // First fill out required fields to avoid other validation errors
      await user.type(screen.getByLabelText(/feed title/i), 'Test Feed')
      await user.type(screen.getByLabelText(/feed description/i), 'Test Description')
      await user.type(screen.getByLabelText(/feed link/i), 'https://example.com')
      await user.selectOptions(screen.getByLabelText(/email rule/i), 'rule-1')

      // Use the same approach as the working API integration test
      const maxItemsInput = screen.getByDisplayValue('100')
      await user.clear(maxItemsInput)
      await user.type(maxItemsInput, '0')

      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(
        () => {
          expect(screen.getByText(/Max items must be greater than 0/)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('validates max_age_days must be greater than 0', async () => {
      const user = userEvent.setup()
      await renderFeedForm()

      // First fill out required fields to avoid other validation errors
      await user.type(screen.getByLabelText(/feed title/i), 'Test Feed')
      await user.type(screen.getByLabelText(/feed description/i), 'Test Description')
      await user.type(screen.getByLabelText(/feed link/i), 'https://example.com')
      await user.selectOptions(screen.getByLabelText(/email rule/i), 'rule-1')

      const maxAgeDaysInput = screen.getByDisplayValue('30')
      await user.clear(maxAgeDaysInput)
      await user.type(maxAgeDaysInput, '0')

      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Max age must be greater than 0/)).toBeInTheDocument()
      })
    })

    it('validates min_items cannot be negative', async () => {
      const user = userEvent.setup()
      await renderFeedForm()

      // First fill out required fields to avoid other validation errors
      await user.type(screen.getByLabelText(/feed title/i), 'Test Feed')
      await user.type(screen.getByLabelText(/feed description/i), 'Test Description')
      await user.type(screen.getByLabelText(/feed link/i), 'https://example.com')
      await user.selectOptions(screen.getByLabelText(/email rule/i), 'rule-1')

      const minItemsInput = screen.getByLabelText(/min items/i)
      await user.clear(minItemsInput)
      await user.type(minItemsInput, '-1')

      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/min items cannot be negative/i)).toBeInTheDocument()
      })
    })

    it('validates min_items cannot exceed max_items', async () => {
      const user = userEvent.setup()
      await renderFeedForm()

      // First fill out required fields to avoid other validation errors
      await user.type(screen.getByLabelText(/feed title/i), 'Test Feed')
      await user.type(screen.getByLabelText(/feed description/i), 'Test Description')
      await user.type(screen.getByLabelText(/feed link/i), 'https://example.com')
      await user.selectOptions(screen.getByLabelText(/email rule/i), 'rule-1')

      // Set min_items > max_items
      const maxItemsInput = screen.getByLabelText(/max items/i)
      const minItemsInput = screen.getByLabelText(/min items/i)
      
      await user.clear(maxItemsInput)
      await user.type(maxItemsInput, '50')
      
      await user.clear(minItemsInput)
      await user.type(minItemsInput, '75')

      const submitButton = screen.getByRole('button', { name: /create feed/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/min items cannot exceed max items/i)).toBeInTheDocument()
      })
    })

    it('clears validation errors when user corrects input', async () => {
      const user = userEvent.setup()
      await renderFeedForm()

      // First fill out required fields to avoid other validation errors
      await user.type(screen.getByLabelText(/feed title/i), 'Test Feed')
      await user.type(screen.getByLabelText(/feed description/i), 'Test Description')
      await user.type(screen.getByLabelText(/feed link/i), 'https://example.com')
      await user.selectOptions(screen.getByLabelText(/email rule/i), 'rule-1')

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

  describe('Retention Policy API Integration', () => {
    it('includes retention fields in create request', async () => {
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

      await renderFeedForm({ onSubmit: mockOnSubmit })

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

    it('includes retention fields in update request', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()
      
      const mockUpdatedFeed: Feed = {
        ...mockFeed,
        max_items: 200,
        max_age_days: 60,
        min_items: 20,
      }

      vi.mocked(feedsApi.update).mockResolvedValueOnce(mockUpdatedFeed)

      await renderFeedForm({ feed: mockFeed, onSubmit: mockOnSubmit })

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
  })
})