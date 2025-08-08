import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { accountsApi } from '../api/accounts'
import { useToast } from '../components/common/Toast'
import { AccountCardSkeleton } from '../components/common/LoadingSkeleton'
import { AccountProcessingButton } from '../components/AccountProcessingButton'
import type { ImapAccount, ConnectionTestResult } from '../types'

export default function Accounts() {
  const { state, dispatch } = useAppContext()
  const toast = useToast()
  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({})

  useEffect(() => {
    const loadAccounts = async () => {
      dispatch({ type: 'SET_LOADING', payload: true })
      try {
        const accounts = await accountsApi.getAll()
        dispatch({ type: 'SET_ACCOUNTS', payload: accounts })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load accounts' })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    loadAccounts()
  }, [dispatch])

  const handleTestConnection = async (account: ImapAccount) => {
    setTestingConnection(account.id)
    try {
      const result = await accountsApi.testConnection(account.id)
      setTestResults(prev => ({ ...prev, [account.id]: result }))
      if (result.success) {
        toast.success('Connection successful', `Successfully connected to ${account.name}`)
      } else {
        toast.error('Connection failed', result.message)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed'
      setTestResults(prev => ({ 
        ...prev, 
        [account.id]: { 
          success: false, 
          message 
        } 
      }))
      toast.error('Connection test failed', message)
    } finally {
      setTestingConnection(null)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? This will also delete all associated rules and feeds.')) {
      return
    }

    try {
      await accountsApi.delete(id)
      dispatch({ type: 'SET_ACCOUNTS', payload: state.accounts.filter(a => a.id !== id) })
      toast.success('Account deleted', 'Account and associated data removed successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account'
      dispatch({ type: 'SET_ERROR', payload: message })
      toast.error('Delete failed', message)
    }
  }


  const getConnectionStatus = (account: ImapAccount) => {
    const result = testResults[account.id]
    if (testingConnection === account.id) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>
          Testing...
        </span>
      )
    }
    if (result) {
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          result.success 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {result.success ? '✓ Connected' : '✗ Failed'}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Not tested
      </span>
    )
  }

  if (state.loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              IMAP Accounts
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your email server connections for feed generation
            </p>
          </div>
        </div>
        
        {/* Loading skeletons */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index}>
                <AccountCardSkeleton />
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            IMAP Accounts
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your email server connections for feed generation
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to="/accounts/new"
            className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Account
          </Link>
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{state.error}</p>
              <button
                onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {state.accounts.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No IMAP accounts</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first email server connection.
          </p>
          <div className="mt-6">
            <Link
              to="/accounts/new"
              className="btn btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add IMAP Account
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {state.accounts.map((account) => (
              <li key={account.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{account.name}</p>
                          <div className="ml-2">
                            {getConnectionStatus(account)}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>{account.username}@{account.host}:{account.port}</span>
                          {account.use_tls && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              TLS
                            </span>
                          )}
                        </div>
                        {testResults[account.id] && !testResults[account.id].success && (
                          <div className="mt-1 text-sm text-red-600">
                            {testResults[account.id].message}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTestConnection(account)}
                        disabled={testingConnection === account.id}
                        className="btn btn-secondary btn-sm"
                      >
                        {testingConnection === account.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                            Testing...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Test
                          </>
                        )}
                      </button>
                      <AccountProcessingButton
                        accountId={account.id}
                        accountName={account.name}
                        size="sm"
                      />
                      <Link
                        to={`/accounts/${account.id}/edit`}
                        className="btn btn-secondary btn-sm"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="btn btn-danger btn-sm"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}