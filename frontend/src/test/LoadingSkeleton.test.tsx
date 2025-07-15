import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoadingSkeleton, AccountListSkeleton, RuleListSkeleton, FeedListSkeleton } from '../components/common/LoadingSkeleton'

describe('LoadingSkeleton', () => {
  describe('Basic LoadingSkeleton', () => {
    it('renders with default props', () => {
      render(<LoadingSkeleton />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveClass('animate-pulse')
      expect(skeleton).toHaveClass('bg-gray-200')
      expect(skeleton).toHaveClass('rounded')
    })

    it('renders text variant correctly', () => {
      render(<LoadingSkeleton variant="text" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('h-4')
      expect(skeleton).toHaveClass('w-full')
    })

    it('renders circular variant correctly', () => {
      render(<LoadingSkeleton variant="circular" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('rounded-full')
      expect(skeleton).toHaveClass('w-12')
      expect(skeleton).toHaveClass('h-12')
    })

    it('renders rectangular variant correctly', () => {
      render(<LoadingSkeleton variant="rectangular" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('rounded-md')
      expect(skeleton).toHaveClass('w-full')
      expect(skeleton).toHaveClass('h-32')
    })

    it('applies custom width', () => {
      render(<LoadingSkeleton width="200px" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveStyle({ width: '200px' })
    })

    it('applies custom height', () => {
      render(<LoadingSkeleton height="100px" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveStyle({ height: '100px' })
    })

    it('applies custom className', () => {
      render(<LoadingSkeleton className="custom-class" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('custom-class')
    })

    it('renders multiple rows for text variant', () => {
      render(<LoadingSkeleton variant="text" rows={3} />)
      
      const skeletons = screen.getAllByTestId('loading-skeleton')
      expect(skeletons).toHaveLength(3)
    })

    it('renders single row when rows is 1', () => {
      render(<LoadingSkeleton variant="text" rows={1} />)
      
      const skeletons = screen.getAllByTestId('loading-skeleton')
      expect(skeletons).toHaveLength(1)
    })

    it('has proper ARIA attributes', () => {
      render(<LoadingSkeleton />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveAttribute('aria-label', 'Loading...')
      expect(skeleton).toHaveAttribute('role', 'status')
    })
  })

  describe('AccountListSkeleton', () => {
    it('renders with default count', () => {
      render(<AccountListSkeleton />)
      
      const skeletons = screen.getAllByTestId('account-skeleton')
      expect(skeletons).toHaveLength(3) // Default count
    })

    it('renders with custom count', () => {
      render(<AccountListSkeleton count={5} />)
      
      const skeletons = screen.getAllByTestId('account-skeleton')
      expect(skeletons).toHaveLength(5)
    })

    it('renders account item structure', () => {
      render(<AccountListSkeleton count={1} />)
      
      const accountSkeleton = screen.getByTestId('account-skeleton')
      expect(accountSkeleton).toBeInTheDocument()
      
      // Check for account name skeleton
      const nameSkeletons = screen.getAllByTestId('loading-skeleton')
      expect(nameSkeletons.length).toBeGreaterThan(0)
    })

    it('has proper card styling', () => {
      render(<AccountListSkeleton count={1} />)
      
      const accountSkeleton = screen.getByTestId('account-skeleton')
      expect(accountSkeleton).toHaveClass('bg-white')
      expect(accountSkeleton).toHaveClass('rounded-lg')
      expect(accountSkeleton).toHaveClass('p-4')
    })

    it('displays loading text', () => {
      render(<AccountListSkeleton />)
      
      expect(screen.getByText('Loading accounts...')).toBeInTheDocument()
    })
  })

  describe('RuleListSkeleton', () => {
    it('renders with default count', () => {
      render(<RuleListSkeleton />)
      
      const skeletons = screen.getAllByTestId('rule-skeleton')
      expect(skeletons).toHaveLength(3) // Default count
    })

    it('renders with custom count', () => {
      render(<RuleListSkeleton count={4} />)
      
      const skeletons = screen.getAllByTestId('rule-skeleton')
      expect(skeletons).toHaveLength(4)
    })

    it('renders rule item structure', () => {
      render(<RuleListSkeleton count={1} />)
      
      const ruleSkeleton = screen.getByTestId('rule-skeleton')
      expect(ruleSkeleton).toBeInTheDocument()
      
      // Check for rule components
      const nameSkeletons = screen.getAllByTestId('loading-skeleton')
      expect(nameSkeletons.length).toBeGreaterThan(0)
    })

    it('has proper card styling', () => {
      render(<RuleListSkeleton count={1} />)
      
      const ruleSkeleton = screen.getByTestId('rule-skeleton')
      expect(ruleSkeleton).toHaveClass('bg-white')
      expect(ruleSkeleton).toHaveClass('rounded-lg')
      expect(ruleSkeleton).toHaveClass('p-4')
    })

    it('displays loading text', () => {
      render(<RuleListSkeleton />)
      
      expect(screen.getByText('Loading rules...')).toBeInTheDocument()
    })
  })

  describe('FeedListSkeleton', () => {
    it('renders with default count', () => {
      render(<FeedListSkeleton />)
      
      const skeletons = screen.getAllByTestId('feed-skeleton')
      expect(skeletons).toHaveLength(3) // Default count
    })

    it('renders with custom count', () => {
      render(<FeedListSkeleton count={2} />)
      
      const skeletons = screen.getAllByTestId('feed-skeleton')
      expect(skeletons).toHaveLength(2)
    })

    it('renders feed item structure', () => {
      render(<FeedListSkeleton count={1} />)
      
      const feedSkeleton = screen.getByTestId('feed-skeleton')
      expect(feedSkeleton).toBeInTheDocument()
      
      // Check for feed components
      const nameSkeletons = screen.getAllByTestId('loading-skeleton')
      expect(nameSkeletons.length).toBeGreaterThan(0)
    })

    it('has proper card styling', () => {
      render(<FeedListSkeleton count={1} />)
      
      const feedSkeleton = screen.getByTestId('feed-skeleton')
      expect(feedSkeleton).toHaveClass('bg-white')
      expect(feedSkeleton).toHaveClass('rounded-lg')
      expect(feedSkeleton).toHaveClass('p-4')
    })

    it('displays loading text', () => {
      render(<FeedListSkeleton />)
      
      expect(screen.getByText('Loading feeds...')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes for screen readers', () => {
      render(<LoadingSkeleton />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveAttribute('aria-label', 'Loading...')
      expect(skeleton).toHaveAttribute('role', 'status')
    })

    it('list skeletons have proper loading announcements', () => {
      render(<AccountListSkeleton />)
      
      const loadingText = screen.getByText('Loading accounts...')
      expect(loadingText).toBeInTheDocument()
    })

    it('supports screen reader announcements', () => {
      render(<LoadingSkeleton />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveAttribute('aria-label', 'Loading...')
    })
  })

  describe('Animation', () => {
    it('has pulse animation class', () => {
      render(<LoadingSkeleton />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('animate-pulse')
    })

    it('maintains animation across variants', () => {
      render(
        <div>
          <LoadingSkeleton variant="text" />
          <LoadingSkeleton variant="circular" />
          <LoadingSkeleton variant="rectangular" />
        </div>
      )
      
      const skeletons = screen.getAllByTestId('loading-skeleton')
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse')
      })
    })
  })

  describe('Responsive Design', () => {
    it('adapts to different screen sizes', () => {
      render(<LoadingSkeleton className="w-full sm:w-1/2 lg:w-1/3" />)
      
      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton).toHaveClass('w-full')
      expect(skeleton).toHaveClass('sm:w-1/2')
      expect(skeleton).toHaveClass('lg:w-1/3')
    })
  })

  describe('Performance', () => {
    it('renders efficiently with many skeletons', () => {
      render(<AccountListSkeleton count={100} />)
      
      const skeletons = screen.getAllByTestId('account-skeleton')
      expect(skeletons).toHaveLength(100)
    })
  })
})