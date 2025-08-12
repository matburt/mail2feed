import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorBoundary } from '../components/common/ErrorBoundary'

// Mock console.error to avoid noise in tests
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

// Component that throws an error (not used but kept for potential future use)
// function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
//   if (shouldThrow) {
//     throw new Error('Test error')
//   }
//   return <div>No error</div>
// }

// Component that throws on render
function AlwaysThrowError() {
  throw new Error('Render error')
  return null // This will never be reached, but TypeScript needs it
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child component</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Child component')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('displays custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('resets error state when retry button is clicked', async () => {
    const user = userEvent.setup()
    let shouldThrow = true

    function ToggleError() {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>No error after retry</div>
    }

    render(
      <ErrorBoundary>
        <ToggleError />
      </ErrorBoundary>
    )

    // Error should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Reset the error condition
    shouldThrow = false

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /try again/i })
    await user.click(retryButton)

    // Component should render successfully now
    expect(screen.getByText('No error after retry')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error Details')).toBeInTheDocument()
    expect(screen.getByText('Render error')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
    expect(screen.queryByText('Render error')).not.toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('persists error state across re-renders until retry', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Re-render with same error
    rerender(
      <ErrorBoundary>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('catches errors from nested components', () => {
    function NestedComponent() {
      return (
        <div>
          <div>
            <AlwaysThrowError />
          </div>
        </div>
      )
    }

    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    )

    consoleSpy.mockRestore()
  })

  it('handles different error types', () => {
    function ThrowStringError() {
      throw 'String error'
    }

    function ThrowObjectError() {
      throw { message: 'Object error' }
    }

    // String error
    render(
      <ErrorBoundary>
        <ThrowStringError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('provides accessibility attributes', () => {
    render(
      <ErrorBoundary>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    const errorMessage = screen.getByText(/an unexpected error occurred/i)
    expect(errorMessage).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()
    expect(retryButton).toHaveAttribute('type', 'button')
  })

  it('handles componentDidCatch lifecycle', () => {
    const onError = vi.fn()
    const error = new Error('Test error')

    render(
      <ErrorBoundary onError={onError}>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalled()
    expect(onError.mock.calls[0][0]).toEqual(expect.any(Error))
    expect(onError.mock.calls[0][1]).toEqual(expect.objectContaining({
      componentStack: expect.any(String),
    }))
  })

  it('displays appropriate error message styling', () => {
    render(
      <ErrorBoundary>
        <AlwaysThrowError />
      </ErrorBoundary>
    )

    const errorContainer = screen.getByText('Something went wrong').closest('div')
    expect(errorContainer).toHaveClass('bg-red-50')
    expect(errorContainer).toHaveClass('border-red-200')
  })

  it('handles multiple error boundaries', () => {
    function InnerError() {
      throw new Error('Inner error')
    }

    function OuterComponent() {
      return (
        <ErrorBoundary>
          <InnerError />
        </ErrorBoundary>
      )
    }

    render(
      <ErrorBoundary>
        <OuterComponent />
      </ErrorBoundary>
    )

    // Inner error boundary should catch the error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('gracefully handles retry when component continues to throw', async () => {
    const user = userEvent.setup()
    let retryCount = 0

    function AlwaysThrowWithCount() {
      retryCount++
      throw new Error(`Error attempt ${retryCount}`)
    }

    render(
      <ErrorBoundary>
        <AlwaysThrowWithCount />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /try again/i })
    await user.click(retryButton)

    // Should still show error after retry
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(retryCount).toBe(2)
  })
})