import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AccountForm from '../components/forms/AccountForm'
import { ToastProvider } from '../components/common/Toast'
import { BrowserRouter } from 'react-router-dom'

// Test wrapper with required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <ToastProvider>
        {children}
      </ToastProvider>
    </BrowserRouter>
  )
}

describe('Accessibility Features', () => {
  it('has proper ARIA labels and descriptions', () => {
    render(
      <TestWrapper>
        <AccountForm />
      </TestWrapper>
    )

    // Check that required fields have proper labeling
    const nameInput = screen.getByLabelText(/account name/i)
    expect(nameInput).toHaveAttribute('aria-describedby')
    expect(nameInput).toHaveAttribute('required')

    const hostInput = screen.getByLabelText(/imap host/i)
    expect(hostInput).toHaveAttribute('aria-describedby')
    expect(hostInput).toHaveAttribute('required')

    const portInput = screen.getByLabelText(/port/i)
    expect(portInput).toHaveAttribute('aria-describedby')
    expect(portInput).toHaveAttribute('required')

    const usernameInput = screen.getByLabelText(/username/i)
    expect(usernameInput).toHaveAttribute('aria-describedby')
    expect(usernameInput).toHaveAttribute('required')

    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('aria-describedby')
    expect(passwordInput).toHaveAttribute('required')

    // Check TLS checkbox has description
    const tlsCheckbox = screen.getByLabelText(/use tls\/ssl encryption/i)
    expect(tlsCheckbox).toHaveAttribute('aria-describedby', 'use_tls-description')
  })

  it('has proper autocomplete attributes', () => {
    render(
      <TestWrapper>
        <AccountForm />
      </TestWrapper>
    )

    const usernameInput = screen.getByLabelText(/username/i)
    expect(usernameInput).toHaveAttribute('autoComplete', 'email')

    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
  })

  it('shows error messages with proper ARIA attributes', async () => {
    render(
      <TestWrapper>
        <AccountForm />
      </TestWrapper>
    )

    // Submit empty form to trigger validation
    const submitButton = screen.getByRole('button', { name: /create account/i })
    submitButton.click()

    // Wait for error messages
    await screen.findByText(/account name is required/i)

    // Check that inputs are marked as invalid
    const nameInput = screen.getByLabelText(/account name/i)
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    expect(nameInput).toHaveAttribute('aria-describedby', 'name-error')

    // Check error message has role="alert"
    const errorMessage = screen.getByText(/account name is required/i)
    expect(errorMessage).toHaveAttribute('role', 'alert')
  })

  it('has proper button labels and types', () => {
    render(
      <TestWrapper>
        <AccountForm />
      </TestWrapper>
    )

    // Check button types and accessibility
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toHaveAttribute('type', 'button')

    const testButton = screen.getByRole('button', { name: /test connection/i })
    expect(testButton).toHaveAttribute('type', 'button')

    const submitButton = screen.getByRole('button', { name: /create account/i })
    expect(submitButton).toHaveAttribute('type', 'submit')
  })
})