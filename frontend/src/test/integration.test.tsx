import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from '../App'
import { AppProvider } from '../context/AppContext'
import { ToastProvider } from '../components/common/Toast'
import { accountsApi } from '../api/accounts'
import { rulesApi } from '../api/rules'
import { feedsApi } from '../api/feeds'
import type { ImapAccount, EmailRule, Feed } from '../types'

// Mock APIs
vi.mock('../api/accounts', () => ({
  accountsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    testConnection: vi.fn(),
  },
}))

vi.mock('../api/rules', () => ({
  rulesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../api/feeds', () => ({
  feedsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockAccount: ImapAccount = {
  id: 1,
  name: 'Test Account',
  host: 'imap.test.com',
  port: 993,
  username: 'test@test.com',
  password: 'password',
  use_tls: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

const mockRule: EmailRule = {
  id: 1,
  name: 'Test Rule',
  imap_account_id: 1,
  from_pattern: 'test@example.com',
  subject_pattern: 'Test',
  body_pattern: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

const mockFeed: Feed = {
  id: 1,
  name: 'Test Feed',
  email_rule_id: 1,
  feed_type: 'rss',
  description: 'Test Description',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  )
}

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default API responses
    vi.mocked(accountsApi.getAll).mockResolvedValue([])
    vi.mocked(rulesApi.getAll).mockResolvedValue([])
    vi.mocked(feedsApi.getAll).mockResolvedValue([])
  })

  describe('Complete User Workflow', () => {
    it('allows user to create account, rule, and feed', async () => {
      const user = userEvent.setup()
      
      // Mock API responses
      vi.mocked(accountsApi.create).mockResolvedValue(mockAccount)
      vi.mocked(accountsApi.testConnection).mockResolvedValue({
        success: true,
        message: 'Connection successful',
      })
      vi.mocked(rulesApi.create).mockResolvedValue(mockRule)
      vi.mocked(feedsApi.create).mockResolvedValue(mockFeed)

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // 1. Navigate to accounts page
      await user.click(screen.getByText('IMAP Accounts'))
      await waitFor(() => {
        expect(screen.getByText('IMAP Accounts')).toBeInTheDocument()
      })

      // 2. Create new account
      await user.click(screen.getByText('Add Account'))
      await waitFor(() => {
        expect(screen.getByText('Add IMAP Account')).toBeInTheDocument()
      })

      // Fill out account form
      await user.type(screen.getByLabelText(/account name/i), 'Test Account')
      await user.type(screen.getByLabelText(/imap host/i), 'imap.test.com')
      await user.type(screen.getByLabelText(/username/i), 'test@test.com')
      await user.type(screen.getByLabelText(/password/i), 'password')

      // Test connection
      await user.click(screen.getByText('Test Connection'))
      await waitFor(() => {
        expect(screen.getByText('Connection successful')).toBeInTheDocument()
      })

      // Submit account
      await user.click(screen.getByText('Create Account'))
      await waitFor(() => {
        expect(accountsApi.create).toHaveBeenCalled()
      })

      // 3. Navigate to rules page
      await user.click(screen.getByText('Email Rules'))
      await waitFor(() => {
        expect(screen.getByText('Email Rules')).toBeInTheDocument()
      })

      // 4. Create new rule
      await user.click(screen.getByText('Add Rule'))
      await waitFor(() => {
        expect(screen.getByText('Add Email Rule')).toBeInTheDocument()
      })

      // Fill out rule form
      await user.type(screen.getByLabelText(/rule name/i), 'Test Rule')
      await user.selectOptions(screen.getByLabelText(/imap account/i), '1')
      await user.type(screen.getByLabelText(/from pattern/i), 'test@example.com')
      await user.type(screen.getByLabelText(/subject pattern/i), 'Test')

      // Submit rule
      await user.click(screen.getByText('Create Rule'))
      await waitFor(() => {
        expect(rulesApi.create).toHaveBeenCalled()
      })

      // 5. Navigate to feeds page
      await user.click(screen.getByText('Feeds'))
      await waitFor(() => {
        expect(screen.getByText('Feeds')).toBeInTheDocument()
      })

      // 6. Create new feed
      await user.click(screen.getByText('Add Feed'))
      await waitFor(() => {
        expect(screen.getByText('Add Feed')).toBeInTheDocument()
      })

      // Fill out feed form
      await user.type(screen.getByLabelText(/feed name/i), 'Test Feed')
      await user.selectOptions(screen.getByLabelText(/email rule/i), '1')
      await user.selectOptions(screen.getByLabelText(/feed type/i), 'rss')
      await user.type(screen.getByLabelText(/description/i), 'Test Description')

      // Submit feed
      await user.click(screen.getByText('Create Feed'))
      await waitFor(() => {
        expect(feedsApi.create).toHaveBeenCalled()
      })
    })

    it('handles navigation between pages', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Start on dashboard
      expect(screen.getByText('Dashboard')).toBeInTheDocument()

      // Navigate to accounts
      await user.click(screen.getByText('IMAP Accounts'))
      await waitFor(() => {
        expect(screen.getByText('IMAP Accounts')).toBeInTheDocument()
      })

      // Navigate to rules
      await user.click(screen.getByText('Email Rules'))
      await waitFor(() => {
        expect(screen.getByText('Email Rules')).toBeInTheDocument()
      })

      // Navigate to feeds
      await user.click(screen.getByText('Feeds'))
      await waitFor(() => {
        expect(screen.getByText('Feeds')).toBeInTheDocument()
      })

      // Navigate back to dashboard
      await user.click(screen.getByText('Dashboard'))
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })

    it('displays data consistently across pages', async () => {
      const user = userEvent.setup()
      
      // Mock API responses with data
      vi.mocked(accountsApi.getAll).mockResolvedValue([mockAccount])
      vi.mocked(rulesApi.getAll).mockResolvedValue([mockRule])
      vi.mocked(feedsApi.getAll).mockResolvedValue([mockFeed])

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('1 accounts')).toBeInTheDocument()
        expect(screen.getByText('1 feeds')).toBeInTheDocument()
      })

      // Navigate to accounts page
      await user.click(screen.getByText('IMAP Accounts'))
      await waitFor(() => {
        expect(screen.getByText('Test Account')).toBeInTheDocument()
      })

      // Navigate to rules page
      await user.click(screen.getByText('Email Rules'))
      await waitFor(() => {
        expect(screen.getByText('Test Rule')).toBeInTheDocument()
      })

      // Navigate to feeds page
      await user.click(screen.getByText('Feeds'))
      await waitFor(() => {
        expect(screen.getByText('Test Feed')).toBeInTheDocument()
      })
    })

    it('handles error states gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock API error
      vi.mocked(accountsApi.create).mockRejectedValue(new Error('API Error'))

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Navigate to accounts page
      await user.click(screen.getByText('IMAP Accounts'))
      await user.click(screen.getByText('Add Account'))

      // Fill out form
      await user.type(screen.getByLabelText(/account name/i), 'Test Account')
      await user.type(screen.getByLabelText(/imap host/i), 'imap.test.com')
      await user.type(screen.getByLabelText(/username/i), 'test@test.com')
      await user.type(screen.getByLabelText(/password/i), 'password')

      // Submit form
      await user.click(screen.getByText('Create Account'))

      // Should display error
      await waitFor(() => {
        expect(screen.getByText(/api error/i)).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Test skip link
      await user.tab()
      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink).toHaveFocus()

      // Test navigation with keyboard
      await user.keyboard('{Enter}')
      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveAttribute('id', 'main-content')
    })

    it('maintains application state during navigation', async () => {
      const user = userEvent.setup()
      
      // Mock API responses
      vi.mocked(accountsApi.getAll).mockResolvedValue([mockAccount])
      vi.mocked(rulesApi.getAll).mockResolvedValue([mockRule])
      vi.mocked(feedsApi.getAll).mockResolvedValue([mockFeed])

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('1 accounts')).toBeInTheDocument()
      })

      // Navigate to different pages
      await user.click(screen.getByText('IMAP Accounts'))
      await user.click(screen.getByText('Email Rules'))
      await user.click(screen.getByText('Dashboard'))

      // State should be maintained
      expect(screen.getByText('1 accounts')).toBeInTheDocument()
      expect(screen.getByText('1 feeds')).toBeInTheDocument()
    })
  })

  describe('Accessibility Integration', () => {
    it('provides proper screen reader support', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Check for proper ARIA landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()

      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('supports high contrast mode', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Check that focus indicators are present
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveClass('focus-ring')
      })
    })
  })

  describe('Performance Integration', () => {
    it('loads efficiently with large datasets', async () => {
      const largeAccountList = Array.from({ length: 100 }, (_, i) => ({
        ...mockAccount,
        id: i + 1,
        name: `Account ${i + 1}`,
      }))

      vi.mocked(accountsApi.getAll).mockResolvedValue(largeAccountList)

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      )

      // Should handle large datasets without issues
      await waitFor(() => {
        expect(screen.getByText('100 accounts')).toBeInTheDocument()
      })
    })
  })
})