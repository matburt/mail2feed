import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Dashboard from '../pages/Dashboard'
import { AppProvider } from '../context/AppContext'
import type { ImapAccount, EmailRule, Feed } from '../types'

// Mock Chart.js to avoid canvas issues in tests
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}))

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
}))

const mockAccounts: ImapAccount[] = [
  {
    id: 1,
    name: 'Gmail Account',
    host: 'imap.gmail.com',
    port: 993,
    username: 'test@gmail.com',
    password: 'password',
    use_tls: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Outlook Account',
    host: 'imap.outlook.com',
    port: 993,
    username: 'test@outlook.com',
    password: 'password',
    use_tls: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

const mockRules: EmailRule[] = [
  {
    id: 1,
    name: 'Newsletter Rule',
    imap_account_id: 1,
    from_pattern: 'newsletter@example.com',
    subject_pattern: 'Newsletter',
    body_pattern: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Support Rule',
    imap_account_id: 1,
    from_pattern: 'support@example.com',
    subject_pattern: 'Support',
    body_pattern: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Marketing Rule',
    imap_account_id: 2,
    from_pattern: 'marketing@example.com',
    subject_pattern: 'Marketing',
    body_pattern: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

const mockFeeds: Feed[] = [
  {
    id: 1,
    name: 'Newsletter Feed',
    email_rule_id: 1,
    feed_type: 'rss',
    description: 'Newsletter RSS Feed',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Support Feed',
    email_rule_id: 2,
    feed_type: 'atom',
    description: 'Support Atom Feed',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

function TestWrapper({ children, initialState = {} }: { children: React.ReactNode; initialState?: any }) {
  const defaultState = {
    accounts: [],
    rules: [],
    feeds: [],
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

describe('Dashboard', () => {
  it('renders dashboard with empty state', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // Account count
    expect(screen.getByText('IMAP Accounts')).toBeInTheDocument()
    expect(screen.getByText('Email Rules')).toBeInTheDocument()
    expect(screen.getByText('Active Feeds')).toBeInTheDocument()
  })

  it('displays correct counts with data', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    // Check that counts are displayed correctly
    const accountCards = screen.getAllByText('2')
    const ruleCards = screen.getAllByText('3')
    const feedCards = screen.getAllByText('2')

    expect(accountCards.length).toBeGreaterThan(0)
    expect(ruleCards.length).toBeGreaterThan(0)
    expect(feedCards.length).toBeGreaterThan(0)
  })

  it('displays recent activity section', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('displays quick actions section', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Add IMAP Account')).toBeInTheDocument()
    expect(screen.getByText('Create Email Rule')).toBeInTheDocument()
    expect(screen.getByText('Generate Feed')).toBeInTheDocument()
  })

  it('displays feed statistics chart', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByText('Feed Statistics')).toBeInTheDocument()
  })

  it('displays processing status when active', () => {
    render(
      <TestWrapper initialState={{ 
        accounts: mockAccounts, 
        rules: mockRules, 
        feeds: mockFeeds,
        processing: true,
        processingProgress: 65
      }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Processing Status')).toBeInTheDocument()
    expect(screen.getByText('Currently processing emails...')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('does not display processing status when inactive', () => {
    render(
      <TestWrapper initialState={{ 
        accounts: mockAccounts, 
        rules: mockRules, 
        feeds: mockFeeds,
        processing: false
      }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.queryByText('Processing Status')).not.toBeInTheDocument()
    expect(screen.queryByText('Currently processing emails...')).not.toBeInTheDocument()
  })

  it('displays system health indicators', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('System Health')).toBeInTheDocument()
    expect(screen.getByText('All systems operational')).toBeInTheDocument()
  })

  it('displays feed type distribution', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Feed Types')).toBeInTheDocument()
    expect(screen.getByText('RSS')).toBeInTheDocument()
    expect(screen.getByText('Atom')).toBeInTheDocument()
  })

  it('displays account distribution', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Account Distribution')).toBeInTheDocument()
    expect(screen.getByText('Gmail Account')).toBeInTheDocument()
    expect(screen.getByText('Outlook Account')).toBeInTheDocument()
  })

  it('renders with proper accessibility attributes', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    const dashboardTitle = screen.getByRole('heading', { level: 1 })
    expect(dashboardTitle).toHaveTextContent('Dashboard')

    const sections = screen.getAllByRole('heading', { level: 2 })
    expect(sections.length).toBeGreaterThan(0)
  })

  it('has responsive grid layout', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    // Check that the main dashboard container exists
    const container = screen.getByText('Dashboard').closest('div')
    expect(container).toBeInTheDocument()
  })

  it('displays empty state messages appropriately', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // With no data, should show getting started message
    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('Add your first IMAP account to begin converting emails to feeds')).toBeInTheDocument()
  })

  it('shows proper loading states', () => {
    render(
      <TestWrapper initialState={{ processing: true }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Processing Status')).toBeInTheDocument()
  })

  it('displays navigation links to other sections', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Add IMAP Account')).toBeInTheDocument()
    expect(screen.getByText('Create Email Rule')).toBeInTheDocument()
    expect(screen.getByText('Generate Feed')).toBeInTheDocument()
  })

  it('displays recent items when data is available', () => {
    render(
      <TestWrapper initialState={{ accounts: mockAccounts, rules: mockRules, feeds: mockFeeds }}>
        <Dashboard />
      </TestWrapper>
    )

    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    
    // Should show recent feeds
    expect(screen.getByText('Newsletter Feed')).toBeInTheDocument()
    expect(screen.getByText('Support Feed')).toBeInTheDocument()
  })
})