import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { rulesApi } from '../api/rules'
import RuleForm from '../components/forms/RuleForm'
import type { EmailRule } from '../types'

export default function RuleEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()
  const [rule, setRule] = useState<EmailRule | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRule = async () => {
      if (!id) {
        navigate('/rules')
        return
      }

      try {
        const ruleData = await rulesApi.getById(id)
        setRule(ruleData)
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load rule' })
        navigate('/rules')
      } finally {
        setLoading(false)
      }
    }

    loadRule()
  }, [id, navigate, dispatch])

  const handleSubmit = (updatedRule: EmailRule) => {
    // Update the rule in the state
    dispatch({ 
      type: 'SET_RULES', 
      payload: state.rules.map(r => 
        r.id === updatedRule.id ? updatedRule : r
      )
    })
    navigate('/rules')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading rule...</span>
      </div>
    )
  }

  if (!rule) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Rule not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The rule you're looking for doesn't exist or has been deleted.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/rules')}
            className="btn btn-primary"
          >
            Back to Rules
          </button>
        </div>
      </div>
    )
  }

  const getFiltersSummary = () => {
    const filters = []
    if (rule.to_address) filters.push(`To: ${rule.to_address}`)
    if (rule.from_address) filters.push(`From: ${rule.from_address}`)
    if (rule.subject_contains) filters.push(`Subject: ${rule.subject_contains}`)
    if (rule.label) filters.push(`Label: ${rule.label}`)
    return filters.length > 0 ? filters.join(', ') : 'No specific filters (all emails)'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Edit Rule: {rule.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Update your email filtering rule settings
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <RuleForm rule={rule} onSubmit={handleSubmit} />
        </div>
      </div>

      {/* Rule Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Rule Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <span className="ml-2 text-gray-600">
              {new Date(rule.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <span className="ml-2 text-gray-600">
              {new Date(rule.updated_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
              rule.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {rule.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Folder:</span>
            <span className="ml-2 text-gray-600">{rule.folder}</span>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium text-gray-700">Current Filters:</span>
            <span className="ml-2 text-gray-600">{getFiltersSummary()}</span>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium text-gray-700">Rule ID:</span>
            <span className="ml-2 text-gray-600 font-mono text-xs">
              {rule.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}