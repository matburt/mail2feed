interface LoadingSkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  rows?: number
}

export function LoadingSkeleton({ 
  className = '',
  variant = 'text',
  width,
  height,
  rows = 1
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full'
      case 'rectangular':
        return 'rounded-md'
      case 'text':
      default:
        return 'rounded'
    }
  }

  const getDefaultDimensions = () => {
    switch (variant) {
      case 'circular':
        return { width: '2.5rem', height: '2.5rem' }
      case 'rectangular':
        return { width: '100%', height: '8rem' }
      case 'text':
      default:
        return { width: '100%', height: '1rem' }
    }
  }

  const defaults = getDefaultDimensions()
  const style = {
    width: width || defaults.width,
    height: height || defaults.height
  }

  if (variant === 'text' && rows > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...style,
              width: index === rows - 1 ? `${Math.random() * 40 + 60}%` : style.width
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={style}
    />
  )
}

// Pre-built skeleton components for common use cases
export function AccountCardSkeleton() {
  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <LoadingSkeleton variant="circular" width="2.5rem" height="2.5rem" />
          <div className="ml-4 space-y-2">
            <LoadingSkeleton width="12rem" height="1rem" />
            <LoadingSkeleton width="8rem" height="0.75rem" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <LoadingSkeleton width="4rem" height="2rem" />
          <LoadingSkeleton width="4rem" height="2rem" />
          <LoadingSkeleton width="4rem" height="2rem" />
        </div>
      </div>
    </div>
  )
}

export function RuleCardSkeleton() {
  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <LoadingSkeleton variant="circular" width="2.5rem" height="2.5rem" />
          <div className="ml-4 space-y-2">
            <LoadingSkeleton width="10rem" height="1rem" />
            <LoadingSkeleton width="16rem" height="0.75rem" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <LoadingSkeleton width="3rem" height="2rem" />
          <LoadingSkeleton width="4rem" height="2rem" />
        </div>
      </div>
    </div>
  )
}

export function FeedCardSkeleton() {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <LoadingSkeleton variant="circular" width="2.5rem" height="2.5rem" />
          <div className="ml-5 w-0 flex-1 space-y-2">
            <LoadingSkeleton width="6rem" height="0.75rem" />
            <LoadingSkeleton width="12rem" height="1.25rem" />
          </div>
          <LoadingSkeleton width="3rem" height="1.5rem" />
        </div>
        <div className="mt-4">
          <LoadingSkeleton rows={2} height="0.875rem" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <LoadingSkeleton width="3rem" height="1.5rem" />
          <div className="flex items-center space-x-2">
            <LoadingSkeleton variant="circular" width="1rem" height="1rem" />
            <LoadingSkeleton variant="circular" width="1rem" height="1rem" />
            <LoadingSkeleton variant="circular" width="1rem" height="1rem" />
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <LoadingSkeleton width="2rem" height="0.875rem" />
            <LoadingSkeleton width="3rem" height="0.875rem" />
          </div>
          <LoadingSkeleton width="4rem" height="0.875rem" />
        </div>
      </div>
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <LoadingSkeleton variant="circular" width="1.5rem" height="1.5rem" />
              <div className="ml-5 w-0 flex-1 space-y-2">
                <LoadingSkeleton width="8rem" height="0.875rem" />
                <LoadingSkeleton width="3rem" height="1.25rem" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <LoadingSkeleton width="6rem" height="0.875rem" />
          </div>
        </div>
      ))}
    </div>
  )
}