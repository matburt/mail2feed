import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import AccountForm from '../components/forms/AccountForm'
import type { ImapAccount } from '../types'

export default function AccountNew() {
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()

  const handleSubmit = (account: ImapAccount) => {
    // Add the new account to the state
    dispatch({ type: 'SET_ACCOUNTS', payload: [...state.accounts, account] })
    navigate('/accounts')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Add IMAP Account
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Connect to your email server to start generating feeds
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <AccountForm onSubmit={handleSubmit} />
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Common IMAP Settings</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Gmail</h4>
              <p>Host: imap.gmail.com</p>
              <p>Port: 993 (TLS)</p>
              <p>Note: Use App Password, not regular password</p>
            </div>
            <div>
              <h4 className="font-medium">Outlook/Hotmail</h4>
              <p>Host: outlook.office365.com</p>
              <p>Port: 993 (TLS)</p>
            </div>
            <div>
              <h4 className="font-medium">Yahoo</h4>
              <p>Host: imap.mail.yahoo.com</p>
              <p>Port: 993 (TLS)</p>
            </div>
            <div>
              <h4 className="font-medium">iCloud</h4>
              <p>Host: imap.mail.me.com</p>
              <p>Port: 993 (TLS)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}