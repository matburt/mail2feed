import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Layout from '../components/layout/Layout'
import { AppProvider } from '../context/AppContext'
import type { ImapAccount, EmailRule, Feed } from '../types'

const mockAccounts: ImapAccount[] = [
  {
    id: 1,
    name: 'Test Account',
    host: 'imap.test.com',
    port: 993,
    username: 'test@test.com',
    password: 'password',
    use_tls: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

const mockRules: EmailRule[] = [
  {
    id: 1,
    name: 'Test Rule',
    imap_account_id: 1,
    from_pattern: 'test@example.com',
    subject_pattern: 'Test',
    body_pattern: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

const mockFeeds: Feed[] = [
  {
    id: 1,
    name: 'Test Feed',
    email_rule_id: 1,
    feed_type: 'rss',
    description: 'Test Description',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

function TestWrapper({ children, initialState = {} }: { children: React.ReactNode; initialState?: any }) {
  const defaultState = {
    accounts: mockAccounts,
    rules: mockRules,
    feeds: mockFeeds,
    processing: false,
    ...initialState,
  }

  return (
    <BrowserRouter>
      <AppProvider initialState={defaultState}>
        {children}
      </AppProvider>
    </BrowserRouter>
  )
}

describe('Layout', () => {
  it('renders header, sidebar, and main content', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Main content</div>
        </Layout>
      </TestWrapper>
    )

    // Check that header is present
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Mail2Feed')).toBeInTheDocument()

    // Check that sidebar is present
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('IMAP Accounts')).toBeInTheDocument()
    expect(screen.getByText('Email Rules')).toBeInTheDocument()
    expect(screen.getByText('Feeds')).toBeInTheDocument()

    // Check that main content is present
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('Main content')).toBeInTheDocument()
  })

  it('has proper semantic HTML structure', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check semantic structure
    expect(screen.getByRole('banner')).toBeInTheDocument() // Header
    expect(screen.getByRole('navigation')).toBeInTheDocument() // Sidebar
    expect(screen.getByRole('main')).toBeInTheDocument() // Main content
  })

  it('has skip link for accessibility', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    const skipLink = screen.getByText('Skip to main content')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('main content has proper id for skip link', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    const mainContent = screen.getByRole('main')
    expect(mainContent).toHaveAttribute('id', 'main-content')
  })

  it('renders with proper layout classes', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    const container = screen.getByRole('main').closest('div')
    expect(container).toHaveClass('flex', 'h-full', 'pt-16')
    
    const mainContent = screen.getByRole('main')
    expect(mainContent).toHaveClass('flex-1', 'overflow-y-auto')
  })

  it('displays header with correct content', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check header content
    expect(screen.getByText('Mail2Feed')).toBeInTheDocument()
    expect(screen.getByText('Convert mailing lists to RSS/Atom feeds')).toBeInTheDocument()
    expect(screen.getByText('1 accounts')).toBeInTheDocument()
    expect(screen.getByText('1 feeds')).toBeInTheDocument()
  })

  it('displays sidebar with navigation items', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('IMAP Accounts')).toBeInTheDocument()
    expect(screen.getByText('Email Rules')).toBeInTheDocument()
    expect(screen.getByText('Feeds')).toBeInTheDocument()
  })

  it('displays correct counts in sidebar', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check that counts are displayed
    expect(screen.getByText('1')).toBeInTheDocument() // Account count
    expect(screen.getByText('1')).toBeInTheDocument() // Rules count  
    expect(screen.getByText('1')).toBeInTheDocument() // Feeds count
  })

  it('shows processing status in sidebar when active', () => {
    render(
      <TestWrapper initialState={{ processing: true, processingProgress: 75 }}>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    expect(screen.getByText('Processing emails...')).toBeInTheDocument()
    expect(screen.getByText('75% complete')).toBeInTheDocument()
  })

  it('does not show processing status when inactive', () => {
    render(
      <TestWrapper initialState={{ processing: false }}>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    expect(screen.queryByText('Processing emails...')).not.toBeInTheDocument()
  })

  it('displays quick actions in sidebar', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Add Account')).toBeInTheDocument()
    expect(screen.getByText('Process All')).toBeInTheDocument()
  })

  it('has proper ARIA labels and roles', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check ARIA attributes
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', 'Main navigation')

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('aria-label', 'Main content')
  })

  it('handles empty state correctly', () => {
    render(
      <TestWrapper initialState={{ accounts: [], rules: [], feeds: [] }}>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Should show 0 counts
    expect(screen.getByText('0 accounts')).toBeInTheDocument()
    expect(screen.getByText('0 feeds')).toBeInTheDocument()
  })

  it('maintains layout structure with different content', () => {
    const { rerender } = render(
      <TestWrapper>
        <Layout>
          <div>Initial content</div>
        </Layout>
      </TestWrapper>
    )

    expect(screen.getByText('Initial content')).toBeInTheDocument()

    rerender(
      <TestWrapper>
        <Layout>
          <div>Updated content</div>
        </Layout>
      </TestWrapper>
    )

    expect(screen.getByText('Updated content')).toBeInTheDocument()
    expect(screen.queryByText('Initial content')).not.toBeInTheDocument()

    // Layout structure should remain
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('supports responsive design', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check responsive classes
    const container = screen.getByRole('main').parentElement
    expect(container).toHaveClass('flex')
    
    const mainContent = screen.getByRole('main')
    expect(mainContent).toHaveClass('flex-1')
  })
})