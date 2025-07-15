import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { feedsApi } from '../api/feeds'
import FeedForm from '../components/forms/FeedForm'
import type { Feed } from '../types'

export default function FeedEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()
  const [feed, setFeed] = useState<Feed | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFeed = async () => {
      if (!id) {
        navigate('/feeds')
        return
      }

      try {
        const feedData = await feedsApi.getById(id)
        setFeed(feedData)
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load feed' })
        navigate('/feeds')
      } finally {
        setLoading(false)
      }
    }

    loadFeed()
  }, [id, navigate, dispatch])

  const handleSubmit = (updatedFeed: Feed) => {
    // Update the feed in the state
    dispatch({ 
      type: 'SET_FEEDS', 
      payload: state.feeds.map(f => 
        f.id === updatedFeed.id ? updatedFeed : f
      )
    })
    navigate('/feeds')
  }

  const copyFeedUrl = async (feedType: 'rss' | 'atom') => {
    if (!feed) return
    
    const url = `${window.location.origin}/feeds/${feed.id}/${feedType}`
    try {
      await navigator.clipboard.writeText(url)
      // You could add a toast notification here
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading feed...</span>
      </div>
    )
  }

  if (!feed) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Feed not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The feed you're looking for doesn't exist or has been deleted.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/feeds')}
            className="btn btn-primary"
          >
            Back to Feeds
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
            Edit Feed: {feed.title}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Update your feed configuration and settings
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <FeedForm feed={feed} onSubmit={handleSubmit} />
        </div>
      </div>

      {/* Feed URLs */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Feed URLs</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <span className="text-sm font-medium text-gray-700">RSS Feed:</span>
                <code className="ml-2 text-sm text-gray-600">/feeds/{feed.id}/rss</code>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyFeedUrl('rss')}
                  className="btn btn-secondary btn-sm"
                >
                  Copy URL
                </button>
                <a
                  href={`/feeds/${feed.id}/rss`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  Open Feed
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <span className="text-sm font-medium text-gray-700">Atom Feed:</span>
                <code className="ml-2 text-sm text-gray-600">/feeds/{feed.id}/atom</code>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyFeedUrl('atom')}
                  className="btn btn-secondary btn-sm"
                >
                  Copy URL
                </button>
                <a
                  href={`/feeds/${feed.id}/atom`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  Open Feed
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Feed Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <span className="ml-2 text-gray-600">
              {new Date(feed.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <span className="ml-2 text-gray-600">
              {new Date(feed.updated_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
              feed.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {feed.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Feed Type:</span>
            <span className="ml-2 text-gray-600 uppercase">{feed.feed_type}</span>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium text-gray-700">Feed ID:</span>
            <span className="ml-2 text-gray-600 font-mono text-xs">
              {feed.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}