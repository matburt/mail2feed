import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import FeedForm from '../components/forms/FeedForm'
import type { Feed } from '../types'

export default function FeedNew() {
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()

  const handleSubmit = (feed: Feed) => {
    // Add the new feed to the state
    dispatch({ type: 'SET_FEEDS', payload: [...state.feeds, feed] })
    navigate('/feeds')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Create Feed
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Generate an RSS/Atom feed from an email rule
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <FeedForm onSubmit={handleSubmit} />
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Feed Configuration Tips</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Feed Title</h4>
              <p>Choose a descriptive title that clearly identifies the content</p>
              <p className="text-xs italic">Example: "Weekly Tech Newsletter"</p>
            </div>
            <div>
              <h4 className="font-medium">Feed Description</h4>
              <p>Provide context about what readers can expect</p>
              <p className="text-xs italic">Example: "Technical articles and updates from our engineering team"</p>
            </div>
            <div>
              <h4 className="font-medium">Feed Link</h4>
              <p>Link to the source website or landing page</p>
              <p className="text-xs italic">Example: "https://company.com/newsletter"</p>
            </div>
            <div>
              <h4 className="font-medium">Email Rule</h4>
              <p>The rule that defines which emails become feed items</p>
              <p className="text-xs italic">Must be created first in the Rules section</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="font-medium">Feed URLs:</p>
            <p>Once created, your feed will be available at:</p>
            <ul className="text-xs mt-1 space-y-1">
              <li>• RSS: <code>/feeds/[feed-id]/rss</code></li>
              <li>• Atom: <code>/feeds/[feed-id]/atom</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}