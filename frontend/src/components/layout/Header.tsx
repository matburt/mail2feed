import { useAppContext } from '../../context/AppContext'

export default function Header() {
  const { state } = useAppContext()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              <span aria-label="Mail to Feed">Mail<span className="text-primary-600">2</span>Feed</span>
            </h1>
            <div className="ml-4 text-sm text-gray-500" aria-label="Application description">
              Convert mailing lists to RSS/Atom feeds
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Status indicators */}
            <div className="flex items-center space-x-2 text-sm" role="status" aria-label="Application status">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2" aria-hidden="true"></div>
                <span className="text-gray-600" aria-label={`${state.accounts.length} accounts configured`}>
                  {state.accounts.length} accounts
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" aria-hidden="true"></div>
                <span className="text-gray-600" aria-label={`${state.feeds.length} feeds active`}>
                  {state.feeds.length} feeds
                </span>
              </div>
              {state.processing && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" aria-hidden="true"></div>
                  <span className="text-gray-600" aria-live="polite">Processing...</span>
                </div>
              )}
            </div>
            
            {/* Settings/Menu */}
            <button 
              className="p-2 text-gray-400 hover:text-gray-500 focus-ring rounded-md" 
              aria-label="Open settings menu"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}