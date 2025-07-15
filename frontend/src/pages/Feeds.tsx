import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { feedsApi } from '../api/feeds'
import { rulesApi } from '../api/rules'
import type { Feed, EmailRule } from '../types'

export default function Feeds() {
  const { state, dispatch } = useAppContext()
  const [rules, setRules] = useState<EmailRule[]>([])

  useEffect(() => {
    const loadData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true })
      try {
        const [feeds, rulesData] = await Promise.all([
          feedsApi.getAll(),
          rulesApi.getAll()
        ])
        dispatch({ type: 'SET_FEEDS', payload: feeds })
        setRules(rulesData)
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load feeds' })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    loadData()
  }, [dispatch])

  const handleDeleteFeed = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feed? This will also delete all feed items.')) {
      return
    }

    try {
      await feedsApi.delete(id)
      dispatch({ type: 'SET_FEEDS', payload: state.feeds.filter(f => f.id !== id) })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete feed' })
    }
  }

  const getRuleName = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId)
    return rule ? rule.name : 'Unknown Rule'
  }

  const copyFeedUrl = async (feedId: string, feedType: 'rss' | 'atom') => {
    const url = `${window.location.origin}/feeds/${feedId}/${feedType}`
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

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading feeds...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Feeds
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            RSS and Atom feeds generated from your email rules
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to="/feeds/new"
            className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Feed
          </Link>
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{state.error}</p>
              <button
                onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feeds List */}
      {state.feeds.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No feeds</h3>
          <p className="mt-1 text-sm text-gray-500">
            {rules.length === 0 
              ? 'Create email rules first, then generate feeds from them.'
              : 'Get started by creating your first feed from an email rule.'
            }
          </p>
          <div className="mt-6">
            {rules.length === 0 ? (
              <Link
                to="/rules"
                className="btn btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Create Email Rules
              </Link>
            ) : (
              <Link
                to="/feeds/new"
                className="btn btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Feed
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {state.feeds.map((feed) => (
            <div key={feed.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      feed.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <svg className={`h-5 w-5 ${feed.is_active ? 'text-green-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {getRuleName(feed.email_rule_id)}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">{feed.title}</dd>
                    </dl>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      feed.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {feed.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {feed.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 uppercase">
                      {feed.feed_type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {/* RSS URL */}
                      <button
                        onClick={() => copyFeedUrl(feed.id, 'rss')}
                        title="Copy RSS URL"
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                      </button>
                      {/* Atom URL */}
                      <button
                        onClick={() => copyFeedUrl(feed.id, 'atom')}
                        title="Copy Atom URL"
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </button>
                      {/* External link */}
                      <a
                        href={`/feeds/${feed.id}/rss`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open RSS feed"
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Link
                      to={`/feeds/${feed.id}/edit`}
                      className="font-medium text-primary-700 hover:text-primary-900"
                    >
                      Edit
                    </Link>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="font-medium text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                  <span className="text-gray-500">
                    {new Date(feed.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      {state.feeds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Using Your Feeds</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>Your feeds are now available for subscription in any RSS/Atom reader:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>RSS URL:</strong> <code>/feeds/[feed-id]/rss</code></li>
              <li><strong>Atom URL:</strong> <code>/feeds/[feed-id]/atom</code></li>
              <li>Click the copy buttons above to get the exact URLs</li>
              <li>Add these URLs to your favorite feed reader (Miniflux, Feedly, etc.)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}