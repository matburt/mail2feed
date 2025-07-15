import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ToastProvider, useToast } from '../components/common/Toast'

// Test component that uses the toast hook
function TestComponent() {
  const toast = useToast()

  return (
    <div>
      <button onClick={() => toast.success('Success!', 'Operation completed')}>
        Success Toast
      </button>
      <button onClick={() => toast.error('Error!', 'Something went wrong')}>
        Error Toast
      </button>
      <button onClick={() => toast.warning('Warning!', 'Be careful')}>
        Warning Toast
      </button>
      <button onClick={() => toast.info('Info!', 'Just so you know')}>
        Info Toast
      </button>
      <button onClick={() => toast.addToast({ type: 'success', title: 'Custom', duration: 100 })}>
        Short Duration Toast
      </button>
    </div>
  )
}

const renderWithToast = () => {
  return render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>
  )
}

// Mock timers for testing auto-dismiss
vi.useFakeTimers()

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
  })

  it('displays success toast', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithToast()

    const successButton = screen.getByRole('button', { name: /success toast/i })
    await user.click(successButton)

    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(screen.getByText('Operation completed')).toBeInTheDocument()
    expect(screen.getByLabelText(/success/i)).toBeInTheDocument() // Success icon
  })

  it('displays error toast', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithToast()

    const errorButton = screen.getByRole('button', { name: /error toast/i })
    await user.click(errorButton)

    expect(screen.getByText('Error!')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('displays warning toast', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithToast()

    const warningButton = screen.getByRole('button', { name: /warning toast/i })
    await user.click(warningButton)

    expect(screen.getByText('Warning!')).toBeInTheDocument()
    expect(screen.getByText('Be careful')).toBeInTheDocument()
  })

  it('displays info toast', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithToast()

    const infoButton = screen.getByRole('button', { name: /info toast/i })
    await user.click(infoButton)

    expect(screen.getByText('Info!')).toBeInTheDocument()
    expect(screen.getByText('Just so you know')).toBeInTheDocument()
  })

  it('removes toast when close button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithToast()

    const successButton = screen.getByRole('button', { name: /success toast/i })
    await user.click(successButton)

    expect(screen.getByText('Success!')).toBeInTheDocument()

    const closeButton = screen.getByRole('button', { name: '' }) // Close button with X icon
    await user.click(closeButton)

    expect(screen.queryByText('Success!')).not.toBeInTheDocument()
  })

  it('auto-removes toast after default duration', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithToast()

    const successButton = screen.getByRole('button', { name: /success toast/i })
    await user.click(successButton)

    expect(screen.getByText('Success!')).toBeInTheDocument()

    // Fast-forward time by default duration (5 seconds)
    vi.advanceTimersByTime(5000)

    await waitFor(() => {
      expect(screen.queryByText('Success!')).not.toBeInTheDocument()
    })
  })

  it('auto-removes toast after custom duration', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithToast()

    const shortDurationButton = screen.getByRole('button', { name: /short duration toast/i })
    await user.click(shortDurationButton)

    expect(screen.getByText('Custom')).toBeInTheDocument()

    // Fast-forward time by custom duration (100ms)
    vi.advanceTimersByTime(100)

    await waitFor(() => {
      expect(screen.queryByText('Custom')).not.toBeInTheDocument()
    })
  })

  it('displays multiple toasts simultaneously', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithToast()

    const successButton = screen.getByRole('button', { name: /success toast/i })
    const errorButton = screen.getByRole('button', { name: /error toast/i })

    await user.click(successButton)
    await user.click(errorButton)

    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(screen.getByText('Error!')).toBeInTheDocument()
  })

  it('maintains toast order (newest on top)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithToast()

    const successButton = screen.getByRole('button', { name: /success toast/i })
    const errorButton = screen.getByRole('button', { name: /error toast/i })

    await user.click(successButton)
    await user.click(errorButton)

    const toasts = screen.getAllByRole('generic').filter(el => 
      el.textContent?.includes('Success!') || el.textContent?.includes('Error!')
    )

    // Error toast should appear before Success toast in DOM (newest first)
    expect(toasts[0]).toHaveTextContent('Error!')
    expect(toasts[1]).toHaveTextContent('Success!')
  })

  it('throws error when useToast is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = vi.fn()

    function BadComponent() {
      useToast()
      return <div>Bad</div>
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    )

    console.error = originalError
  })

  it('handles toast without message', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    
    function TitleOnlyComponent() {
      const toast = useToast()
      return (
        <button onClick={() => toast.success('Title Only')}>
          Title Only Toast
        </button>
      )
    }

    render(
      <ToastProvider>
        <TitleOnlyComponent />
      </ToastProvider>
    )

    const button = screen.getByRole('button', { name: /title only toast/i })
    await user.click(button)

    expect(screen.getByText('Title Only')).toBeInTheDocument()
    // Should not have a message paragraph
    expect(screen.queryByText(/title only/i)).toHaveLength(1) // Only the title
  })
})