import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { accountsApi } from '../api/accounts'
import AccountForm from '../components/forms/AccountForm'
import type { ImapAccount } from '../types'

export default function AccountEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()
  const [account, setAccount] = useState<ImapAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAccount = async () => {
      if (!id) {
        navigate('/accounts')
        return
      }

      try {
        const accountData = await accountsApi.getById(id)
        setAccount(accountData)
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load account' })
        navigate('/accounts')
      } finally {
        setLoading(false)
      }
    }

    loadAccount()
  }, [id, navigate, dispatch])

  const handleSubmit = (updatedAccount: ImapAccount) => {
    // Update the account in the state
    dispatch({ 
      type: 'SET_ACCOUNTS', 
      payload: state.accounts.map(acc => 
        acc.id === updatedAccount.id ? updatedAccount : acc
      )
    })
    navigate('/accounts')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading account...</span>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Account not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The account you're looking for doesn't exist or has been deleted.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/accounts')}
            className="btn btn-primary"
          >
            Back to Accounts
          </button>
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
            Edit Account: {account.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Update your email server connection settings
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <AccountForm account={account} onSubmit={handleSubmit} />
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <span className="ml-2 text-gray-600">
              {new Date(account.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <span className="ml-2 text-gray-600">
              {new Date(account.updated_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Account ID:</span>
            <span className="ml-2 text-gray-600 font-mono text-xs">
              {account.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}