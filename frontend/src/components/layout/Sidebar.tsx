import { NavLink } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'

export default function Sidebar() {
  const { state } = useAppContext()

  const navItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      ),
    },
    {
      name: 'IMAP Accounts',
      href: '/accounts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      count: state.accounts.length,
    },
    {
      name: 'Email Rules',
      href: '/rules',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      count: state.rules.length,
    },
    {
      name: 'Feeds',
      href: '/feeds',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      ),
      count: state.feeds.length,
    },
  ]

  return (
    <nav className="bg-gray-50 w-64 min-h-screen border-r border-gray-200" role="navigation" aria-label="Main navigation">
      <div className="p-4">
        <div className="space-y-1" role="list">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors focus-ring ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
              aria-current={({ isActive }) => isActive ? 'page' : undefined}
              role="listitem"
            >
              <span className="mr-3 flex-shrink-0" aria-hidden="true">{item.icon}</span>
              <span className="flex-1">{item.name}</span>
              {item.count !== undefined && (
                <span 
                  className="ml-3 inline-block py-0.5 px-2 text-xs font-medium bg-gray-200 text-gray-700 rounded-full"
                  aria-label={`${item.count} ${item.name.toLowerCase()}`}
                >
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Processing Status */}
        {state.processing && (
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm text-yellow-800 font-medium">
                Processing emails...
              </span>
            </div>
            {state.processingProgress && (
              <div className="mt-2">
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${state.processingProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-yellow-700 mt-1 block">
                  {state.processingProgress}% complete
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Quick Actions
          </h3>
          <button 
            className="w-full text-left px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors focus-ring"
            type="button"
            aria-label="Add new IMAP account"
          >
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Account
            </div>
          </button>
          <button 
            className="w-full text-left px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors focus-ring"
            type="button"
            aria-label="Process all email accounts now"
          >
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Process All
            </div>
          </button>
        </div>
      </div>
    </nav>
  )
}