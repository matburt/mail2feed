import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { rulesApi } from '../../api/rules'
import { accountsApi } from '../../api/accounts'
import { useFolderLoader } from '../../hooks/useFolderLoader'
import type { EmailRule, CreateEmailRuleRequest, UpdateEmailRuleRequest, ImapAccount } from '../../types'

interface RuleFormProps {
  rule?: EmailRule
  onSubmit?: (rule: EmailRule) => void
  onCancel?: () => void
}

export default function RuleForm({ rule, onSubmit, onCancel }: RuleFormProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<ImapAccount[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    imap_account_id: rule?.imap_account_id || '',
    folder: rule?.folder || 'INBOX',
    to_address: rule?.to_address || '',
    from_address: rule?.from_address || '',
    subject_contains: rule?.subject_contains || '',
    label: rule?.label || '',
    is_active: rule?.is_active ?? true,
    post_process_action: rule?.post_process_action || '',
    move_to_folder: rule?.move_to_folder || '',
    inherit_account_defaults: !rule // Default to true for new rules
  })

  // State for manual folder input
  const [useCustomFolder, setUseCustomFolder] = useState(false)
  const [customFolder, setCustomFolder] = useState('')

  // Load folders for the selected IMAP account
  const { folders, isLoading: foldersLoading, error: foldersError, refetch: refetchFolders } = useFolderLoader(
    formData.imap_account_id || undefined
  )

  // Check if current folder is custom (not in the folders list)
  useEffect(() => {
    if (formData.folder && !folders.includes(formData.folder)) {
      setUseCustomFolder(true)
      setCustomFolder(formData.folder)
    } else {
      setUseCustomFolder(false)
      setCustomFolder('')
    }
  }, [formData.folder, folders])

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountsData = await accountsApi.getAll()
        setAccounts(accountsData)
        
        // If creating a new rule and no account selected, select the first one
        if (!rule && !formData.imap_account_id && accountsData.length > 0) {
          setFormData(prev => ({ ...prev, imap_account_id: accountsData[0].id }))
        }
      } catch (error) {
        setErrors({ accounts: 'Failed to load IMAP accounts' })
      }
    }

    loadAccounts()
  }, [rule, formData.imap_account_id])

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        imap_account_id: rule.imap_account_id,
        folder: rule.folder,
        to_address: rule.to_address || '',
        from_address: rule.from_address || '',
        subject_contains: rule.subject_contains || '',
        label: rule.label || '',
        is_active: rule.is_active,
        post_process_action: rule.post_process_action || '',
        move_to_folder: rule.move_to_folder || '',
        inherit_account_defaults: false // Existing rules don't inherit by default
      })
    }
  }, [rule])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Rule name is required'
    }
    
    if (!formData.imap_account_id) {
      newErrors.imap_account_id = 'IMAP account is required'
    }
    
    if (!formData.folder.trim()) {
      newErrors.folder = 'Folder is required'
    }

    // At least one filter condition should be specified
    const hasFilter = formData.to_address.trim() || 
                     formData.from_address.trim() || 
                     formData.subject_contains.trim() || 
                     formData.label.trim()
    
    if (!hasFilter) {
      newErrors.filters = 'At least one filter condition is required (To, From, Subject, or Label)'
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
      let savedRule: EmailRule
      
      // Prepare data with undefined values for empty strings
      const requestData = {
        ...formData,
        to_address: formData.to_address.trim() || undefined,
        from_address: formData.from_address.trim() || undefined,
        subject_contains: formData.subject_contains.trim() || undefined,
        label: formData.label.trim() || undefined,
        post_process_action: formData.inherit_account_defaults ? undefined : (formData.post_process_action || undefined),
        move_to_folder: formData.inherit_account_defaults ? undefined : (formData.move_to_folder.trim() || undefined)
      }
      
      if (rule) {
        // Update existing rule
        const updateData: UpdateEmailRuleRequest = requestData
        savedRule = await rulesApi.update(rule.id, updateData)
      } else {
        // Create new rule
        const createData: CreateEmailRuleRequest = requestData
        savedRule = await rulesApi.create(createData)
      }
      
      if (onSubmit) {
        onSubmit(savedRule)
      } else {
        navigate('/rules')
      }
    } catch (error) {
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to save rule' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      navigate('/rules')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    
    // Clear filters error when any filter field is filled
    if (['to_address', 'from_address', 'subject_contains', 'label'].includes(name) && value.trim()) {
      setErrors(prev => ({ ...prev, filters: '' }))
    }
  }

  // Handle custom folder toggle
  const handleCustomFolderToggle = () => {
    if (useCustomFolder) {
      // Switching back to dropdown - reset to INBOX if custom folder isn't in list
      setUseCustomFolder(false)
      setCustomFolder('')
      if (!folders.includes(formData.folder)) {
        setFormData(prev => ({ ...prev, folder: 'INBOX' }))
      }
    } else {
      // Switching to custom input
      setUseCustomFolder(true)
      setCustomFolder(formData.folder)
    }
  }

  // Handle custom folder input change
  const handleCustomFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomFolder(value)
    setFormData(prev => ({ ...prev, folder: value }))
    
    // Clear error when user starts typing
    if (errors.folder) {
      setErrors(prev => ({ ...prev, folder: '' }))
    }
  }


  if (accounts.length === 0 && !errors.accounts) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No IMAP accounts</h3>
        <p className="mt-1 text-sm text-gray-500">
          You need to add an IMAP account before creating email rules.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/accounts')}
            className="btn btn-primary"
          >
            Add IMAP Account
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(errors.submit || errors.accounts) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{errors.submit || errors.accounts}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Rule Name */}
        <div className="sm:col-span-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Rule Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.name 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="Newsletter Rule"
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-600">{errors.name}</p>
            )}
          </div>
        </div>

        {/* IMAP Account */}
        <div className="sm:col-span-3">
          <label htmlFor="imap_account_id" className="block text-sm font-medium text-gray-700">
            IMAP Account
          </label>
          <div className="mt-1">
            <select
              name="imap_account_id"
              id="imap_account_id"
              value={formData.imap_account_id}
              onChange={handleChange}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.imap_account_id 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
            >
              <option value="">Select an account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.username})
                </option>
              ))}
            </select>
            {errors.imap_account_id && (
              <p className="mt-2 text-sm text-red-600">{errors.imap_account_id}</p>
            )}
          </div>
        </div>

        {/* Folder */}
        <div className="sm:col-span-3">
          <div className="flex items-center justify-between">
            <label htmlFor="folder" className="block text-sm font-medium text-gray-700">
              Email Folder
              {foldersLoading && (
                <span className="ml-2 text-xs text-gray-500">Loading folders...</span>
              )}
            </label>
            <button
              type="button"
              onClick={handleCustomFolderToggle}
              className="text-xs text-primary-600 hover:text-primary-700 underline"
            >
              {useCustomFolder ? 'Use dropdown' : 'Enter custom folder'}
            </button>
          </div>
          
          <div className="mt-1">
            {useCustomFolder ? (
              <input
                type="text"
                name="folder"
                id="folder"
                value={customFolder}
                onChange={handleCustomFolderChange}
                placeholder="Enter folder name (e.g., INBOX/Lists)"
                className={`block w-full shadow-sm sm:text-sm rounded-md ${
                  errors.folder 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                }`}
              />
            ) : (
              <select
                name="folder"
                id="folder"
                value={formData.folder}
                onChange={handleChange}
                disabled={foldersLoading}
                className={`block w-full shadow-sm sm:text-sm rounded-md ${
                  errors.folder 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                } ${foldersLoading ? 'bg-gray-50 cursor-wait' : ''}`}
              >
                {folders.map(folder => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            )}
            
            {/* Error state with retry button */}
            {foldersError && !useCustomFolder && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-amber-600 flex-1">
                  {foldersError} (using default folders)
                </p>
                <button
                  type="button"
                  onClick={refetchFolders}
                  className="ml-2 text-xs text-primary-600 hover:text-primary-700 underline"
                >
                  Retry
                </button>
              </div>
            )}
            
            {/* Regular validation error */}
            {errors.folder && (
              <p className="mt-2 text-sm text-red-600">{errors.folder}</p>
            )}
            
            {/* Helper text for custom folder */}
            {useCustomFolder && (
              <p className="mt-2 text-sm text-gray-500">
                Enter the exact folder name as it appears in your email client. Use forward slashes for nested folders (e.g., "INBOX/Lists").
              </p>
            )}
          </div>
        </div>

        {/* Filter Conditions */}
        <div className="sm:col-span-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Conditions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Specify at least one condition to filter emails. Leave fields empty to ignore that condition.
          </p>
          
          {errors.filters && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{errors.filters}</p>
            </div>
          )}
        </div>

        {/* To Address */}
        <div className="sm:col-span-3">
          <label htmlFor="to_address" className="block text-sm font-medium text-gray-700">
            To Address
          </label>
          <div className="mt-1">
            <input
              type="email"
              name="to_address"
              id="to_address"
              value={formData.to_address}
              onChange={handleChange}
              className="block w-full shadow-sm sm:text-sm rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
              placeholder="newsletter@example.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              Filter emails sent to this address
            </p>
          </div>
        </div>

        {/* From Address */}
        <div className="sm:col-span-3">
          <label htmlFor="from_address" className="block text-sm font-medium text-gray-700">
            From Address
          </label>
          <div className="mt-1">
            <input
              type="email"
              name="from_address"
              id="from_address"
              value={formData.from_address}
              onChange={handleChange}
              className="block w-full shadow-sm sm:text-sm rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
              placeholder="sender@example.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              Filter emails from this sender
            </p>
          </div>
        </div>

        {/* Subject Contains */}
        <div className="sm:col-span-3">
          <label htmlFor="subject_contains" className="block text-sm font-medium text-gray-700">
            Subject Contains
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="subject_contains"
              id="subject_contains"
              value={formData.subject_contains}
              onChange={handleChange}
              className="block w-full shadow-sm sm:text-sm rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Newsletter"
            />
            <p className="mt-1 text-xs text-gray-500">
              Filter emails with this text in subject
            </p>
          </div>
        </div>

        {/* Label */}
        <div className="sm:col-span-3">
          <label htmlFor="label" className="block text-sm font-medium text-gray-700">
            Label/Tag
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="label"
              id="label"
              value={formData.label}
              onChange={handleChange}
              className="block w-full shadow-sm sm:text-sm rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
              placeholder="important"
            />
            <p className="mt-1 text-xs text-gray-500">
              Filter emails with this label (Gmail, etc.)
            </p>
          </div>
        </div>

      </div>

      {/* Email Handling Settings */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Email Handling</h3>
        
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          {/* Inherit Account Defaults */}
          <div className="sm:col-span-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="inherit_account_defaults"
                id="inherit_account_defaults"
                checked={formData.inherit_account_defaults}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="inherit_account_defaults" className="ml-2 block text-sm text-gray-900">
                Use account default email handling
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              When enabled, this rule will use the default email handling settings from the IMAP account.
            </p>
          </div>

          {/* Custom Email Handling - only show when not inheriting */}
          {!formData.inherit_account_defaults && (
            <>
              {/* Post Process Action */}
              <div className="sm:col-span-4">
                <label htmlFor="post_process_action" className="block text-sm font-medium text-gray-700">
                  Action After Processing
                </label>
                <div className="mt-1">
                  <select
                    name="post_process_action"
                    id="post_process_action"
                    value={formData.post_process_action}
                    onChange={handleChange}
                    className="block w-full shadow-sm sm:text-sm rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Use account default</option>
                    <option value="do_nothing">Do Nothing</option>
                    <option value="mark_read">Mark as Read</option>
                    <option value="delete">Delete Email</option>
                    <option value="move_to_folder">Move to Folder</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    What to do with emails after they've been processed into feed items
                  </p>
                </div>
              </div>

              {/* Move to Folder */}
              {formData.post_process_action === 'move_to_folder' && (
                <div className="sm:col-span-4">
                  <label htmlFor="move_to_folder" className="block text-sm font-medium text-gray-700">
                    Target Folder
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="move_to_folder"
                      id="move_to_folder"
                      value={formData.move_to_folder}
                      onChange={handleChange}
                      className="block w-full shadow-sm sm:text-sm rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Processed"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Folder name to move emails to after processing
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rule Status */}
      <div className="border-t border-gray-200 pt-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          {/* Is Active */}
          <div className="sm:col-span-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Rule is active
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Inactive rules will not process new emails but existing feeds remain accessible.
            </p>
          </div>
        </div>
      </div>

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
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {rule ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            rule ? 'Update Rule' : 'Create Rule'
          )}
        </button>
      </div>
    </form>
  )
}