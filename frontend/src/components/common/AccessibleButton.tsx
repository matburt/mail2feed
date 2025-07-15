import { forwardRef, ButtonHTMLAttributes } from 'react'

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    loadingText = 'Loading...', 
    disabled,
    className = '',
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'btn focus-ring'
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary', 
      danger: 'btn-danger'
    }
    const sizeClasses = {
      sm: 'btn-sm',
      md: '',
      lg: 'px-6 py-3 text-base'
    }

    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            <span className="sr-only">Loading: </span>
          </>
        )}
        {loading ? loadingText : children}
      </button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'