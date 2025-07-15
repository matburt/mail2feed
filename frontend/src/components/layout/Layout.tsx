import { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import { SkipLink } from '../common/SkipLink'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-full">
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <Header />
      <div className="flex h-full pt-16">
        <Sidebar />
        <main id="main-content" className="flex-1 overflow-y-auto" role="main" aria-label="Main content">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}