import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import AccountNew from './pages/AccountNew'
import AccountEdit from './pages/AccountEdit'
import Rules from './pages/Rules'
import RuleNew from './pages/RuleNew'
import RuleEdit from './pages/RuleEdit'
import Feeds from './pages/Feeds'
import FeedNew from './pages/FeedNew'
import FeedEdit from './pages/FeedEdit'
import FeedItems from './pages/FeedItems'
import NotFound from './pages/NotFound'
import { AppProvider } from './context/AppContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ToastProvider } from './components/common/Toast'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <div className="h-full">
            <Layout>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/accounts/new" element={<AccountNew />} />
                  <Route path="/accounts/:id/edit" element={<AccountEdit />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="/rules/new" element={<RuleNew />} />
                  <Route path="/rules/:id/edit" element={<RuleEdit />} />
                  <Route path="/feeds" element={<Feeds />} />
                  <Route path="/feeds/new" element={<FeedNew />} />
                  <Route path="/feeds/:id/edit" element={<FeedEdit />} />
                  <Route path="/feeds/:id/items" element={<FeedItems />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </Layout>
          </div>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App