import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import RuleForm from '../components/forms/RuleForm'
import type { EmailRule } from '../types'

export default function RuleNew() {
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()

  const handleSubmit = (rule: EmailRule) => {
    // Add the new rule to the state
    dispatch({ type: 'SET_RULES', payload: [...state.rules, rule] })
    navigate('/rules')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Add Email Rule
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create a rule to filter which emails become feed items
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <RuleForm onSubmit={handleSubmit} />
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Email Rule Examples</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Newsletter Subscription</h4>
              <p>To: newsletter@company.com</p>
              <p>Subject: Contains "Weekly Update"</p>
              <p>Creates feed items from company newsletters</p>
            </div>
            <div>
              <h4 className="font-medium">GitHub Notifications</h4>
              <p>From: notifications@github.com</p>
              <p>Subject: Contains "[username/repo]"</p>
              <p>Converts GitHub notifications to feed</p>
            </div>
            <div>
              <h4 className="font-medium">Mailing List Archive</h4>
              <p>To: list@example.org</p>
              <p>Folder: INBOX</p>
              <p>Archives mailing list discussions</p>
            </div>
            <div>
              <h4 className="font-medium">Important Label</h4>
              <p>Label: Important</p>
              <p>Any folder</p>
              <p>Converts labeled emails to feed items</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="font-medium">Pro Tip:</p>
            <p>You can combine multiple conditions. For example, filter emails from a specific sender that also contain certain keywords in the subject line.</p>
          </div>
        </div>
      </div>
    </div>
  )
}