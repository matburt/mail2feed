import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { feedsApi } from '../api/feeds'
import type { Feed, FeedItemMetadata } from '../types'

export default function FeedItems() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [feed, setFeed] = useState<Feed | null>(null)
  const [items, setItems] = useState<FeedItemMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      navigate('/feeds')
      return
    }

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [feedData, itemsData] = await Promise.all([
          feedsApi.getById(id),
          feedsApi.getItemsMetadata(id)
        ])
        setFeed(feedData)
        setItems(itemsData)
      } catch (error) {
        console.error('Failed to load feed items:', error)
        setError(error instanceof Error ? error.message : 'Failed to load feed items')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, navigate])


  const formatBodySize = (size: number | undefined) => {
    if (!size) return 'N/A'
    if (size < 1024) return `${size} bytes`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading feed items...</span>
      </div>
    )
  }

  if (!feed) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Feed not found</h3>
        <p className="mt-2 text-sm text-gray-500">The requested feed could not be found.</p>
        <div className="mt-6">
          <Link to="/feeds" className="btn btn-primary">
            Back to Feeds
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/feeds" className="text-gray-700 hover:text-gray-900">
                  Feeds
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-gray-500 md:ml-2">{feed.title}</span>
                </div>
              </li>
            </ol>
          </nav>
          <h2 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Feed Items
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage items for "{feed.title}" feed
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to="/feeds"
            className="btn btn-secondary"
          >
            Back to Feeds
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed Items List */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Items will appear here once emails are processed for this feed.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-start">
                  <div className="flex-1 min-w-0">
                    {/* Title and Metadata */}
                    <div className="flex items-start space-x-3">

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          item.is_read ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {item.title}
                        </p>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          {item.author && (
                            <span className="flex items-center">
                              <svg className="flex-shrink-0 mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {item.author}
                            </span>
                          )}
                          <span className="flex items-center">
                            <svg className="flex-shrink-0 mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatDate(item.pub_date)}
                          </span>
                          <span className="flex items-center">
                            <svg className="flex-shrink-0 mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {formatBodySize(item.body_size)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats */}
      {items.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Total items: {items.length}</span>
            <span>Showing feed content</span>
          </div>
        </div>
      )}
    </div>
  )
}