import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppProvider, useAppContext } from '../context/AppContext'
import type { ImapAccount, EmailRule, Feed } from '../types'

// Test component to access context
function TestComponent() {
  const { state, dispatch } = useAppContext()
  
  return (
    <div>
      <div data-testid="accounts-count">{state.accounts.length}</div>
      <div data-testid="rules-count">{state.rules.length}</div>
      <div data-testid="feeds-count">{state.feeds.length}</div>
      <div data-testid="processing">{state.processing.toString()}</div>
      <div data-testid="processing-progress">{state.processingProgress || 0}</div>
      <button 
        data-testid="add-account"
        onClick={() => dispatch({ 
          type: 'ADD_ACCOUNT', 
          payload: {
            id: 1,
            name: 'Test Account',
            host: 'imap.test.com',
            port: 993,
            username: 'test@test.com',
            password: 'password',
            use_tls: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })}
      >
        Add Account
      </button>
      <button 
        data-testid="set-processing"
        onClick={() => dispatch({ type: 'SET_PROCESSING', payload: true })}
      >
        Set Processing
      </button>
    </div>
  )
}

describe('AppContext', () => {
  it('provides initial state', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    )

    expect(screen.getByTestId('accounts-count')).toHaveTextContent('0')
    expect(screen.getByTestId('rules-count')).toHaveTextContent('0')
    expect(screen.getByTestId('feeds-count')).toHaveTextContent('0')
    expect(screen.getByTestId('processing')).toHaveTextContent('false')
    expect(screen.getByTestId('processing-progress')).toHaveTextContent('0')
  })

  it('handles ADD_ACCOUNT action', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    )

    act(() => {
      screen.getByTestId('add-account').click()
    })

    expect(screen.getByTestId('accounts-count')).toHaveTextContent('1')
  })

  it('handles SET_ACCOUNTS action', () => {
    function SetAccountsTest() {
      const { dispatch } = useAppContext()
      
      const accounts: ImapAccount[] = [
        {
          id: 1,
          name: 'Account 1',
          host: 'imap1.test.com',
          port: 993,
          username: 'test1@test.com',
          password: 'password1',
          use_tls: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Account 2',
          host: 'imap2.test.com',
          port: 993,
          username: 'test2@test.com',
          password: 'password2',
          use_tls: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      return (
        <div>
          <TestComponent />
          <button 
            data-testid="set-accounts"
            onClick={() => dispatch({ type: 'SET_ACCOUNTS', payload: accounts })}
          >
            Set Accounts
          </button>
        </div>
      )
    }

    render(
      <AppProvider>
        <SetAccountsTest />
      </AppProvider>
    )

    act(() => {
      screen.getByTestId('set-accounts').click()
    })

    expect(screen.getByTestId('accounts-count')).toHaveTextContent('2')
  })

  it('handles UPDATE_ACCOUNT action', () => {
    function UpdateAccountTest() {
      const { state, dispatch } = useAppContext()
      
      const initialAccount: ImapAccount = {
        id: 1,
        name: 'Original Account',
        host: 'imap.test.com',
        port: 993,
        username: 'test@test.com',
        password: 'password',
        use_tls: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const updatedAccount: ImapAccount = {
        ...initialAccount,
        name: 'Updated Account',
        host: 'updated.test.com'
      }

      return (
        <div>
          <div data-testid="account-name">{state.accounts[0]?.name || 'No Account'}</div>
          <div data-testid="account-host">{state.accounts[0]?.host || 'No Host'}</div>
          <button 
            data-testid="add-initial"
            onClick={() => dispatch({ type: 'ADD_ACCOUNT', payload: initialAccount })}
          >
            Add Initial
          </button>
          <button 
            data-testid="update-account"
            onClick={() => dispatch({ type: 'UPDATE_ACCOUNT', payload: updatedAccount })}
          >
            Update Account
          </button>
        </div>
      )
    }

    render(
      <AppProvider>
        <UpdateAccountTest />
      </AppProvider>
    )

    act(() => {
      screen.getByTestId('add-initial').click()
    })

    expect(screen.getByTestId('account-name')).toHaveTextContent('Original Account')
    expect(screen.getByTestId('account-host')).toHaveTextContent('imap.test.com')

    act(() => {
      screen.getByTestId('update-account').click()
    })

    expect(screen.getByTestId('account-name')).toHaveTextContent('Updated Account')
    expect(screen.getByTestId('account-host')).toHaveTextContent('updated.test.com')
  })

  it('handles DELETE_ACCOUNT action', () => {
    function DeleteAccountTest() {
      const { state, dispatch } = useAppContext()
      
      const account: ImapAccount = {
        id: 1,
        name: 'Test Account',
        host: 'imap.test.com',
        port: 993,
        username: 'test@test.com',
        password: 'password',
        use_tls: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      return (
        <div>
          <div data-testid="accounts-count">{state.accounts.length}</div>
          <button 
            data-testid="add-account"
            onClick={() => dispatch({ type: 'ADD_ACCOUNT', payload: account })}
          >
            Add Account
          </button>
          <button 
            data-testid="delete-account"
            onClick={() => dispatch({ type: 'DELETE_ACCOUNT', payload: 1 })}
          >
            Delete Account
          </button>
        </div>
      )
    }

    render(
      <AppProvider>
        <DeleteAccountTest />
      </AppProvider>
    )

    act(() => {
      screen.getByTestId('add-account').click()
    })

    expect(screen.getByTestId('accounts-count')).toHaveTextContent('1')

    act(() => {
      screen.getByTestId('delete-account').click()
    })

    expect(screen.getByTestId('accounts-count')).toHaveTextContent('0')
  })

  it('handles SET_PROCESSING action', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    )

    expect(screen.getByTestId('processing')).toHaveTextContent('false')

    act(() => {
      screen.getByTestId('set-processing').click()
    })

    expect(screen.getByTestId('processing')).toHaveTextContent('true')
  })

  it('handles SET_PROCESSING_PROGRESS action', () => {
    function ProcessingProgressTest() {
      const { state, dispatch } = useAppContext()
      
      return (
        <div>
          <div data-testid="processing-progress">{state.processingProgress || 0}</div>
          <button 
            data-testid="set-progress"
            onClick={() => dispatch({ type: 'SET_PROCESSING_PROGRESS', payload: 75 })}
          >
            Set Progress
          </button>
        </div>
      )
    }

    render(
      <AppProvider>
        <ProcessingProgressTest />
      </AppProvider>
    )

    expect(screen.getByTestId('processing-progress')).toHaveTextContent('0')

    act(() => {
      screen.getByTestId('set-progress').click()
    })

    expect(screen.getByTestId('processing-progress')).toHaveTextContent('75')
  })

  it('handles email rules actions', () => {
    function RulesTest() {
      const { state, dispatch } = useAppContext()
      
      const rule: EmailRule = {
        id: 1,
        name: 'Test Rule',
        imap_account_id: 1,
        from_pattern: 'test@example.com',
        subject_pattern: 'Test Subject',
        body_pattern: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      return (
        <div>
          <div data-testid="rules-count">{state.rules.length}</div>
          <button 
            data-testid="add-rule"
            onClick={() => dispatch({ type: 'ADD_RULE', payload: rule })}
          >
            Add Rule
          </button>
          <button 
            data-testid="delete-rule"
            onClick={() => dispatch({ type: 'DELETE_RULE', payload: 1 })}
          >
            Delete Rule
          </button>
        </div>
      )
    }

    render(
      <AppProvider>
        <RulesTest />
      </AppProvider>
    )

    expect(screen.getByTestId('rules-count')).toHaveTextContent('0')

    act(() => {
      screen.getByTestId('add-rule').click()
    })

    expect(screen.getByTestId('rules-count')).toHaveTextContent('1')

    act(() => {
      screen.getByTestId('delete-rule').click()
    })

    expect(screen.getByTestId('rules-count')).toHaveTextContent('0')
  })

  it('handles feed actions', () => {
    function FeedsTest() {
      const { state, dispatch } = useAppContext()
      
      const feed: Feed = {
        id: 1,
        name: 'Test Feed',
        email_rule_id: 1,
        feed_type: 'rss',
        description: 'Test Description',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      return (
        <div>
          <div data-testid="feeds-count">{state.feeds.length}</div>
          <button 
            data-testid="add-feed"
            onClick={() => dispatch({ type: 'ADD_FEED', payload: feed })}
          >
            Add Feed
          </button>
          <button 
            data-testid="delete-feed"
            onClick={() => dispatch({ type: 'DELETE_FEED', payload: 1 })}
          >
            Delete Feed
          </button>
        </div>
      )
    }

    render(
      <AppProvider>
        <FeedsTest />
      </AppProvider>
    )

    expect(screen.getByTestId('feeds-count')).toHaveTextContent('0')

    act(() => {
      screen.getByTestId('add-feed').click()
    })

    expect(screen.getByTestId('feeds-count')).toHaveTextContent('1')

    act(() => {
      screen.getByTestId('delete-feed').click()
    })

    expect(screen.getByTestId('feeds-count')).toHaveTextContent('0')
  })

  it('throws error when used outside provider', () => {
    // Mock console.error to avoid test noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAppContext must be used within an AppProvider')

    consoleSpy.mockRestore()
  })
})