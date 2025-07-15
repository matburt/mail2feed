import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { feedsApi } from '../../api/feeds'
import { rulesApi } from '../../api/rules'
import type { Feed, CreateFeedRequest, UpdateFeedRequest, EmailRule } from '../../types'

interface FeedFormProps {
  feed?: Feed
  onSubmit?: (feed: Feed) => void
  onCancel?: () => void
}

export default function FeedForm({ feed, onSubmit, onCancel }: FeedFormProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [rules, setRules] = useState<EmailRule[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    title: feed?.title || '',
    description: feed?.description || '',
    link: feed?.link || '',
    email_rule_id: feed?.email_rule_id || '',
    feed_type: feed?.feed_type || 'rss' as 'rss' | 'atom',
    is_active: feed?.is_active ?? true
  })

  useEffect(() => {
    const loadRules = async () => {
      try {
        const rulesData = await rulesApi.getAll()
        setRules(rulesData)
        
        // If creating a new feed and no rule selected, select the first active rule
        if (!feed && !formData.email_rule_id && rulesData.length > 0) {
          const activeRule = rulesData.find(r => r.is_active) || rulesData[0]
          setFormData(prev => ({ ...prev, email_rule_id: activeRule.id }))
        }
      } catch (error) {
        setErrors({ rules: 'Failed to load email rules' })
      }
    }

    loadRules()
  }, [feed, formData.email_rule_id])

  useEffect(() => {
    if (feed) {
      setFormData({
        title: feed.title,
        description: feed.description,
        link: feed.link,
        email_rule_id: feed.email_rule_id,
        feed_type: feed.feed_type,
        is_active: feed.is_active
      })
    }
  }, [feed])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Feed title is required'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Feed description is required'
    }
    
    if (!formData.link.trim()) {
      newErrors.link = 'Feed link is required'
    } else {
      try {
        new URL(formData.link)
      } catch {
        newErrors.link = 'Feed link must be a valid URL'
      }
    }
    
    if (!formData.email_rule_id) {
      newErrors.email_rule_id = 'Email rule is required'
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
      let savedFeed: Feed
      
      if (feed) {
        // Update existing feed
        const updateData: UpdateFeedRequest = formData
        savedFeed = await feedsApi.update(feed.id, updateData)
      } else {
        // Create new feed
        const createData: CreateFeedRequest = formData
        savedFeed = await feedsApi.create(createData)
      }
      
      if (onSubmit) {
        onSubmit(savedFeed)
      } else {
        navigate('/feeds')
      }
    } catch (error) {
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to save feed' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      navigate('/feeds')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
  }

  const getSelectedRule = () => {
    return rules.find(r => r.id === formData.email_rule_id)
  }

  if (rules.length === 0 && !errors.rules) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No email rules</h3>
        <p className="mt-1 text-sm text-gray-500">
          You need to create an email rule before creating feeds.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/rules')}
            className="btn btn-primary"
          >
            Create Email Rule
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(errors.submit || errors.rules) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{errors.submit || errors.rules}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Feed Title */}
        <div className="sm:col-span-6">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Feed Title
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="title"
              id="title"
              value={formData.title}
              onChange={handleChange}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.title 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="Weekly Newsletter Feed"
            />
            {errors.title && (
              <p className="mt-2 text-sm text-red-600">{errors.title}</p>
            )}
          </div>
        </div>

        {/* Feed Description */}
        <div className="sm:col-span-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Feed Description
          </label>
          <div className="mt-1">
            <textarea
              name="description"
              id="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.description 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="A feed containing weekly newsletter emails from our company"
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-600">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Feed Link */}
        <div className="sm:col-span-6">
          <label htmlFor="link" className="block text-sm font-medium text-gray-700">
            Feed Link
          </label>
          <div className="mt-1">
            <input
              type="url"
              name="link"
              id="link"
              value={formData.link}
              onChange={handleChange}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.link 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
              placeholder="https://example.com/newsletter"
            />
            <p className="mt-1 text-xs text-gray-500">
              The website or page associated with this feed
            </p>
            {errors.link && (
              <p className="mt-2 text-sm text-red-600">{errors.link}</p>
            )}
          </div>
        </div>

        {/* Email Rule */}
        <div className="sm:col-span-4">
          <label htmlFor="email_rule_id" className="block text-sm font-medium text-gray-700">
            Email Rule
          </label>
          <div className="mt-1">
            <select
              name="email_rule_id"
              id="email_rule_id"
              value={formData.email_rule_id}
              onChange={handleChange}
              className={`block w-full shadow-sm sm:text-sm rounded-md ${
                errors.email_rule_id 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }`}
            >
              <option value="">Select a rule</option>
              {rules.map(rule => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} {!rule.is_active && '(Inactive)'}
                </option>
              ))}
            </select>
            {errors.email_rule_id && (
              <p className="mt-2 text-sm text-red-600">{errors.email_rule_id}</p>
            )}
            {getSelectedRule() && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                <strong>Rule:</strong> {getSelectedRule()?.name}<br />
                <strong>Folder:</strong> {getSelectedRule()?.folder}
              </div>
            )}
          </div>
        </div>

        {/* Feed Type */}
        <div className="sm:col-span-2">
          <label htmlFor="feed_type" className="block text-sm font-medium text-gray-700">
            Feed Type
          </label>
          <div className="mt-1">
            <select
              name="feed_type"
              id="feed_type"
              value={formData.feed_type}
              onChange={handleChange}
              className="block w-full shadow-sm sm:text-sm rounded-md border-gray-300 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="rss">RSS 2.0</option>
              <option value="atom">Atom 1.0</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Both types will be available regardless of this setting
            </p>
          </div>
        </div>

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
              Feed is active
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Inactive feeds will not be updated with new emails but remain accessible to readers.
          </p>
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
              {feed ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            feed ? 'Update Feed' : 'Create Feed'
          )}
        </button>
      </div>
    </form>
  )
}