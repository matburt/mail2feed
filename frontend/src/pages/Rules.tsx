import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { rulesApi } from '../api/rules'
import { accountsApi } from '../api/accounts'
import type { EmailRule, ImapAccount } from '../types'

export default function Rules() {
  const { state, dispatch } = useAppContext()
  const [accounts, setAccounts] = useState<ImapAccount[]>([])

  useEffect(() => {
    const loadData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true })
      try {
        const [rules, accountsData] = await Promise.all([
          rulesApi.getAll(),
          accountsApi.getAll()
        ])
        dispatch({ type: 'SET_RULES', payload: rules })
        setAccounts(accountsData)
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load rules' })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    loadData()
  }, [dispatch])

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule? This will also delete all associated feeds.')) {
      return
    }

    try {
      await rulesApi.delete(id)
      dispatch({ type: 'SET_RULES', payload: state.rules.filter(r => r.id !== id) })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete rule' })
    }
  }

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId)
    return account ? account.name : 'Unknown Account'
  }

  const getRuleTypeDisplay = (rule: EmailRule) => {
    const conditions = []
    if (rule.to_address) conditions.push(`To: ${rule.to_address}`)
    if (rule.from_address) conditions.push(`From: ${rule.from_address}`)
    if (rule.subject_contains) conditions.push(`Subject: ${rule.subject_contains}`)
    if (rule.label) conditions.push(`Label: ${rule.label}`)
    
    return conditions.length > 0 ? conditions.join(', ') : 'All emails'
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading rules...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Email Rules
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Define which emails should be converted to feed items
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to="/rules/new"
            className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Rule
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

      {/* Rules List */}
      {state.rules.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No email rules</h3>
          <p className="mt-1 text-sm text-gray-500">
            {accounts.length === 0 
              ? 'Add an IMAP account first, then create rules to filter emails.'
              : 'Get started by creating your first email filtering rule.'
            }
          </p>
          <div className="mt-6">
            {accounts.length === 0 ? (
              <Link
                to="/accounts"
                className="btn btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Add IMAP Account
              </Link>
            ) : (
              <Link
                to="/rules/new"
                className="btn btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Email Rule
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {state.rules.map((rule) => (
              <li key={rule.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          rule.is_active ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <svg className={`h-5 w-5 ${rule.is_active ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rule.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span className="font-medium">{getAccountName(rule.imap_account_id)}</span>
                          <span className="mx-2">•</span>
                          <span>{rule.folder}</span>
                          <span className="mx-2">•</span>
                          <span>{getRuleTypeDisplay(rule)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/rules/${rule.id}/edit`}
                        className="btn btn-secondary btn-sm"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
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

      {/* Getting Started Help */}
      {state.rules.length === 0 && accounts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">How Email Rules Work</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>Email rules define which emails from your IMAP accounts should be converted into feed items:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Folder:</strong> Which email folder to monitor (INBOX, Sent, etc.)</li>
              <li><strong>To Address:</strong> Filter emails sent to a specific address</li>
              <li><strong>From Address:</strong> Filter emails from a specific sender</li>
              <li><strong>Subject:</strong> Filter emails containing specific text in the subject</li>
              <li><strong>Label/Tag:</strong> Filter emails with specific labels (Gmail, etc.)</li>
            </ul>
            <p className="mt-3">You can combine multiple conditions, and each rule can generate its own RSS/Atom feed.</p>
          </div>
        </div>
      )}
    </div>
  )
}