import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountsApi } from '../../api/accounts'
import { useToast } from '../common/Toast'
import { useAutoSave } from '../../hooks/useAutoSave'
import type { ImapAccount, CreateImapAccountRequest, UpdateImapAccountRequest } from '../../types'

interface AccountFormProps {
  account?: ImapAccount
  onSubmit?: (account: ImapAccount) => void
  onCancel?: () => void
}

export default function AccountForm({ account, onSubmit, onCancel }: AccountFormProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    name: account?.name || '',
    host: account?.host || '',
    port: account?.port || 993,
    username: account?.username || '',
    password: account?.password || '',
    use_tls: account?.use_tls ?? true,
    default_post_process_action: account?.default_post_process_action || 'mark_read',
    default_move_to_folder: account?.default_move_to_folder || ''
  })

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        host: account.host,
        port: account.port,
        username: account.username,
        password: account.password,
        use_tls: account.use_tls,
        default_post_process_action: account.default_post_process_action,
        default_move_to_folder: account.default_move_to_folder || ''
      })
    }
  }, [account])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required'
    }
    
    if (!formData.host.trim()) {
      newErrors.host = 'Host is required'
    }
    
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535'
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      let savedAccount: ImapAccount
      
      if (account) {
        // Update existing account
        const updateData: UpdateImapAccountRequest = formData
        savedAccount = await accountsApi.update(account.id, updateData)
      } else {
        // Create new account
        const createData: CreateImapAccountRequest = formData
        savedAccount = await accountsApi.create(createData)
      }
      
      if (onSubmit) {
        onSubmit(savedAccount)
      } else {
        navigate('/accounts')
      }
      toast.success(
        account ? 'Account updated' : 'Account created',
        `${savedAccount.name} has been ${account ? 'updated' : 'created'} successfully`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save account'
      setErrors({ submit: message })
      toast.error(account ? 'Update failed' : 'Creation failed', message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!validateForm()) {
      return
    }

    setTesting(true)
    setTestResult(null)
    
    try {
      // For new accounts, we need to create temporarily to test
      if (!account) {
        const createData: CreateImapAccountRequest = formData
        const tempAccount = await accountsApi.create(createData)
        
        try {
          const result = await accountsApi.testConnection(tempAccount.id)
          setTestResult({
            success: result.success,
            message: result.success ? 'Successfully connected to IMAP server' : (result.error || 'Connection failed')
          })
          
          if (result.success) {
            toast.success('Connection test passed', 'Successfully connected to IMAP server')
          } else {
            toast.error('Connection test failed', result.error || 'Connection failed')
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Connection test failed'
          toast.error('Connection test failed', message)
          throw error
        } finally {
          // Always delete the temporary account after testing
          try {
            await accountsApi.delete(tempAccount.id)
          } catch (deleteError) {
            console.warn('Failed to delete temporary account:', deleteError)
          }
        }
      } else {
        // For existing accounts, update first then test
        const updateData: UpdateImapAccountRequest = formData
        await accountsApi.update(account.id, updateData)
        const result = await accountsApi.testConnection(account.id)
        setTestResult({
          success: result.success,
          message: result.success ? 'Successfully connected to IMAP server' : (result.error || 'Connection failed')
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      navigate('/accounts')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = 'checked' in e.target ? e.target.checked : false
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Auto-save functionality for existing accounts only
  const autoSaveFunction = async (data: typeof formData) => {
    if (!account) return // Only auto-save for existing accounts
    
    const updateData: UpdateImapAccountRequest = data
    await accountsApi.update(account.id, updateData)
  }

  const validateAutoSave = (data: typeof formData) => {
    return data.name.trim() !== '' && 
           data.host.trim() !== '' && 
           data.username.trim() !== '' && 
           data.password.trim() !== '' &&
           data.port > 0 && data.port <= 65535
  }

  const { hasUnsavedChanges } = useAutoSave({
    data: formData,
    saveFunction: autoSaveFunction,
    delay: 3000,
    enabled: !!account, // Only enable for existing accounts
    validateFunction: validateAutoSave,
    onSaveSuccess: () => toast.success('Auto-saved', 'Changes saved automatically'),
    onSaveError: (error) => console.error('Auto-save failed:', error)
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Unsaved changes indicator */}
      {account && hasUnsavedChanges() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">You have unsaved changes that will be auto-saved in a few seconds.</p>
            </div>
          </div>
        </div>
      )}

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Account Name */}
        <div className="sm:col-span-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Account Name *
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              aria-describedby={errors.name ? "name-error" : "name-description"}
              aria-invalid={!!errors.name}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.name 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="My Email Account"
            />
            {!errors.name && (
              <p id="name-description" className="mt-1 text-sm text-gray-500">
                A friendly name to identify this email account
              </p>
            )}
            {errors.name && (
              <p id="name-error" className="mt-2 text-sm text-red-600" role="alert">{errors.name}</p>
            )}
          </div>
        </div>

        {/* Host */}
        <div className="sm:col-span-4">
          <label htmlFor="host" className="block text-sm font-medium text-gray-700">
            IMAP Host *
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="host"
              id="host"
              value={formData.host}
              onChange={handleChange}
              required
              aria-describedby={errors.host ? "host-error" : "host-description"}
              aria-invalid={!!errors.host}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.host 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="imap.gmail.com"
            />
            {!errors.host && (
              <p id="host-description" className="mt-1 text-sm text-gray-500">
                IMAP server hostname (e.g., imap.gmail.com)
              </p>
            )}
            {errors.host && (
              <p id="host-error" className="mt-2 text-sm text-red-600" role="alert">{errors.host}</p>
            )}
          </div>
        </div>

        {/* Port */}
        <div className="sm:col-span-2">
          <label htmlFor="port" className="block text-sm font-medium text-gray-700">
            Port *
          </label>
          <div className="mt-1">
            <input
              type="number"
              name="port"
              id="port"
              value={formData.port}
              onChange={handleChange}
              min="1"
              max="65535"
              required
              aria-describedby={errors.port ? "port-error" : "port-description"}
              aria-invalid={!!errors.port}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.port 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
            />
            {!errors.port && (
              <p id="port-description" className="mt-1 text-sm text-gray-500">
                Usually 993 for IMAP with TLS
              </p>
            )}
            {errors.port && (
              <p id="port-error" className="mt-2 text-sm text-red-600" role="alert">{errors.port}</p>
            )}
          </div>
        </div>

        {/* Username */}
        <div className="sm:col-span-3">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username *
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="username"
              id="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="email"
              aria-describedby={errors.username ? "username-error" : "username-description"}
              aria-invalid={!!errors.username}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.username 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="your-email@example.com"
            />
            {!errors.username && (
              <p id="username-description" className="mt-1 text-sm text-gray-500">
                Your email address or username
              </p>
            )}
            {errors.username && (
              <p id="username-error" className="mt-2 text-sm text-red-600" role="alert">{errors.username}</p>
            )}
          </div>
        </div>

        {/* Password */}
        <div className="sm:col-span-3">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password *
          </label>
          <div className="mt-1">
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              aria-describedby={errors.password ? "password-error" : "password-description"}
              aria-invalid={!!errors.password}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.password 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="••••••••"
            />
            {!errors.password && (
              <p id="password-description" className="mt-1 text-sm text-gray-500">
                Your email account password or app-specific password
              </p>
            )}
            {errors.password && (
              <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">{errors.password}</p>
            )}
          </div>
        </div>

        {/* Use TLS */}
        <div className="sm:col-span-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="use_tls"
              id="use_tls"
              checked={formData.use_tls}
              onChange={handleChange}
              aria-describedby="use_tls-description"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="use_tls" className="ml-2 block text-sm text-gray-900">
              Use TLS/SSL encryption
            </label>
          </div>
          <p id="use_tls-description" className="mt-2 text-sm text-gray-500">
            Recommended for secure connections. Most email providers require TLS.
          </p>
        </div>
      </div>

      {/* Email Handling Settings */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Default Email Handling</h3>
        <p className="text-sm text-gray-500 mb-6">
          These settings will be used as defaults for new email rules. Individual rules can override these settings.
        </p>
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          {/* Default Post Process Action */}
          <div className="sm:col-span-4">
            <label htmlFor="default_post_process_action" className="block text-sm font-medium text-gray-700">
              Default Action After Processing
            </label>
            <div className="mt-1">
              <select
                name="default_post_process_action"
                id="default_post_process_action"
                value={formData.default_post_process_action}
                onChange={handleChange}
                aria-describedby="default_post_process_action-description"
                className="block w-full shadow-sm sm:text-sm rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="do_nothing">Do Nothing</option>
                <option value="mark_read">Mark as Read</option>
                <option value="delete">Delete Email</option>
                <option value="move_to_folder">Move to Folder</option>
              </select>
              <p id="default_post_process_action-description" className="mt-1 text-sm text-gray-500">
                What to do with emails after they've been processed into feed items
              </p>
            </div>
          </div>

          {/* Default Move to Folder */}
          {formData.default_post_process_action === 'move_to_folder' && (
            <div className="sm:col-span-4">
              <label htmlFor="default_move_to_folder" className="block text-sm font-medium text-gray-700">
                Default Target Folder
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="default_move_to_folder"
                  id="default_move_to_folder"
                  value={formData.default_move_to_folder}
                  onChange={handleChange}
                  aria-describedby="default_move_to_folder-description"
                  className="block w-full shadow-sm sm:text-sm rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Processed"
                />
                <p id="default_move_to_folder-description" className="mt-1 text-sm text-gray-500">
                  Folder name to move emails to (leave empty to use rule-specific folders)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Test Result */}
      {testResult && (
        <div className={`rounded-md p-4 ${
          testResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            <svg 
              className={`w-5 h-5 ${testResult.success ? 'text-green-400' : 'text-red-400'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {testResult.success ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <div className="ml-3">
              <p className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="btn btn-secondary"
        >
          {testing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              Testing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test Connection
            </>
          )}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {account ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            account ? 'Update Account' : 'Create Account'
          )}
        </button>
      </div>
    </form>
  )
}