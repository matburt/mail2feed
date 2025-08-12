import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppProvider, useAppContext } from '../context/AppContext'
import type { ImapAccount } from '../types'

// Test component to access context
function TestComponent() {
  const { state, dispatch } = useAppContext()
  
  return (
    <div>
      <div data-testid="accounts-count">{state.accounts.length}</div>
      <div data-testid="rules-count">{state.rules.length}</div>
      <div data-testid="feeds-count">{state.feeds.length}</div>
      <div data-testid="processing">{state.processing ? 'active' : 'null'}</div>
      <div data-testid="processing-progress">{state.processingProgress || 0}</div>
      <button 
        data-testid="add-account"
        onClick={() => dispatch({ 
          type: 'ADD_ACCOUNT', 
          payload: {
            id: '1',
            name: 'Test Account',
            host: 'imap.test.com',
            port: 993,
            username: 'test@test.com',
            password: 'password',
            use_tls: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            default_post_process_action: 'do_nothing',
          }
        })}
      >
        Add Account
      </button>
      <button 
        data-testid="set-processing"
        onClick={() => dispatch({ 
          type: 'SET_PROCESSING_STATUS', 
          payload: {
            total_emails_processed: 5,
            new_feed_items_created: 3,
            errors: []
          }
        })}
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
    expect(screen.getByTestId('processing')).toHaveTextContent('null')
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

  it('handles SET_PROCESSING_STATUS action', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    )

    act(() => {
      screen.getByTestId('set-processing').click()
    })

    expect(screen.getByTestId('processing')).toHaveTextContent('active')
  })

  it('handles SET_ACCOUNTS action', () => {
    function TestAccountsComponent() {
      const { state, dispatch } = useAppContext()
      
      const handleSetAccounts = () => {
        const accounts: ImapAccount[] = [
          {
            id: '1',
            name: 'Account 1',
            host: 'imap1.test.com',
            port: 993,
            username: 'user1@test.com',
            password: 'password1',
            use_tls: true,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            default_post_process_action: 'do_nothing',
          },
          {
            id: '2',
            name: 'Account 2',
            host: 'imap2.test.com',
            port: 993,
            username: 'user2@test.com',
            password: 'password2',
            use_tls: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            default_post_process_action: 'mark_read',
          }
        ]
        dispatch({ type: 'SET_ACCOUNTS', payload: accounts })
      }
      
      return (
        <div>
          <div data-testid="accounts-count">{state.accounts.length}</div>
          <button data-testid="set-accounts" onClick={handleSetAccounts}>
            Set Accounts
          </button>
        </div>
      )
    }

    render(
      <AppProvider>
        <TestAccountsComponent />
      </AppProvider>
    )

    act(() => {
      screen.getByTestId('set-accounts').click()
    })

    expect(screen.getByTestId('accounts-count')).toHaveTextContent('2')
  })

  it('handles UPDATE_ACCOUNT action', () => {
    function TestUpdateComponent() {
      const { state, dispatch } = useAppContext()
      
      const handleSetupAndUpdate = () => {
        // First add an account
        const account: ImapAccount = {
          id: '1',
          name: 'Original Account',
          host: 'imap.test.com',
          port: 993,
          username: 'test@test.com',
          password: 'password',
          use_tls: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          default_post_process_action: 'do_nothing',
        }
        dispatch({ type: 'ADD_ACCOUNT', payload: account })
        
        // Then update it
        const updatedAccount = { ...account, name: 'Updated Account' }
        dispatch({ type: 'UPDATE_ACCOUNT', payload: updatedAccount })
      }
      
      return (
        <div>
          <div data-testid="account-name">
            {state.accounts.length > 0 ? state.accounts[0].name : 'None'}
          </div>
          <button data-testid="setup-and-update" onClick={handleSetupAndUpdate}>
            Setup and Update
          </button>
        </div>
      )
    }

    render(
      <AppProvider>
        <TestUpdateComponent />
      </AppProvider>
    )

    act(() => {
      screen.getByTestId('setup-and-update').click()
    })

    expect(screen.getByTestId('account-name')).toHaveTextContent('Updated Account')
  })

  it('handles DELETE_ACCOUNT action', () => {
    function TestDeleteComponent() {
      const { state, dispatch } = useAppContext()
      
      const handleSetupAndDelete = () => {
        // First add accounts
        const accounts: ImapAccount[] = [
          {
            id: '1',
            name: 'Account 1',
            host: 'imap1.test.com',
            port: 993,
            username: 'user1@test.com',
            password: 'password1',
            use_tls: true,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            default_post_process_action: 'do_nothing',
          },
          {
            id: '2',
            name: 'Account 2',
            host: 'imap2.test.com',
            port: 993,
            username: 'user2@test.com',
            password: 'password2',
            use_tls: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            default_post_process_action: 'mark_read',
          }
        ]
        dispatch({ type: 'SET_ACCOUNTS', payload: accounts })
        
        // Then delete one
        dispatch({ type: 'DELETE_ACCOUNT', payload: '1' })
      }
      
      return (
        <div>
          <div data-testid="accounts-count">{state.accounts.length}</div>
          <div data-testid="remaining-account">
            {state.accounts.length > 0 ? state.accounts[0].name : 'None'}
          </div>
          <button data-testid="setup-and-delete" onClick={handleSetupAndDelete}>
            Setup and Delete
          </button>
        </div>
      )
    }

    render(
      <AppProvider>
        <TestDeleteComponent />
      </AppProvider>
    )

    act(() => {
      screen.getByTestId('setup-and-delete').click()
    })

    expect(screen.getByTestId('accounts-count')).toHaveTextContent('1')
    expect(screen.getByTestId('remaining-account')).toHaveTextContent('Account 2')
  })
})