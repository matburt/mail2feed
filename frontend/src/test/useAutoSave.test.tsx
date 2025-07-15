import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAutoSave } from '../hooks/useAutoSave'
import { ToastProvider } from '../components/common/Toast'

// Mock timers
vi.useFakeTimers()

// Test wrapper with ToastProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('useAutoSave', () => {
  const mockSaveFunction = vi.fn()
  const mockValidateFunction = vi.fn()
  const mockOnSaveSuccess = vi.fn()
  const mockOnSaveError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  it('does not trigger save when data hasnt changed', () => {
    const { result } = renderHook(
      () => useAutoSave({
        data: { name: 'test' },
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
      }),
      { wrapper: TestWrapper }
    )

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockSaveFunction).not.toHaveBeenCalled()
    expect(result.current.hasUnsavedChanges()).toBe(false)
  })

  it('triggers save after delay when data changes', async () => {
    mockSaveFunction.mockResolvedValue(undefined)
    
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // Change data
    rerender({ data: { name: 'updated' } })

    // Fast forward time
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(mockSaveFunction).toHaveBeenCalledWith({ name: 'updated' })
  })

  it('cancels previous timeout when data changes again', async () => {
    mockSaveFunction.mockResolvedValue(undefined)
    
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // First change
    rerender({ data: { name: 'updated1' } })
    
    // Fast forward halfway
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Second change before first timeout completes
    rerender({ data: { name: 'updated2' } })

    // Complete the full delay
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Should only save the latest data
    expect(mockSaveFunction).toHaveBeenCalledTimes(1)
    expect(mockSaveFunction).toHaveBeenCalledWith({ name: 'updated2' })
  })

  it('respects enabled flag', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useAutoSave({
        data: { name: 'test' },
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { enabled: false }
      }
    )

    // Change data while disabled
    rerender({ enabled: false })

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockSaveFunction).not.toHaveBeenCalled()
  })

  it('validates data before saving', async () => {
    mockValidateFunction.mockReturnValue(false)
    
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
        validateFunction: mockValidateFunction,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // Change data
    rerender({ data: { name: 'invalid' } })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(mockValidateFunction).toHaveBeenCalledWith({ name: 'invalid' })
    expect(mockSaveFunction).not.toHaveBeenCalled()
  })

  it('calls onSaveSuccess when save succeeds', async () => {
    mockSaveFunction.mockResolvedValue(undefined)
    
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
        onSaveSuccess: mockOnSaveSuccess,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // Change data
    rerender({ data: { name: 'updated' } })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(mockOnSaveSuccess).toHaveBeenCalled()
  })

  it('calls onSaveError when save fails', async () => {
    const saveError = new Error('Save failed')
    mockSaveFunction.mockRejectedValue(saveError)
    
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
        onSaveError: mockOnSaveError,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // Change data
    rerender({ data: { name: 'updated' } })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(mockOnSaveError).toHaveBeenCalledWith(saveError)
  })

  it('prevents concurrent saves', async () => {
    // Mock a slow save function
    mockSaveFunction.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 500))
    )
    
    const { rerender, result } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // Change data to trigger first save
    rerender({ data: { name: 'updated1' } })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Change data again while first save is in progress
    rerender({ data: { name: 'updated2' } })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Should only have called save once (concurrent save prevented)
    expect(mockSaveFunction).toHaveBeenCalledTimes(1)
  })

  it('provides saveNow function for manual save', async () => {
    mockSaveFunction.mockResolvedValue(undefined)
    
    const { result } = renderHook(
      () => useAutoSave({
        data: { name: 'test' },
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
      }),
      { wrapper: TestWrapper }
    )

    await act(async () => {
      result.current.saveNow()
    })

    expect(mockSaveFunction).toHaveBeenCalledWith({ name: 'test' })
  })

  it('saveNow cancels pending timeout', async () => {
    mockSaveFunction.mockResolvedValue(undefined)
    
    const { rerender, result } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // Change data to start timeout
    rerender({ data: { name: 'updated' } })

    // Call saveNow before timeout
    await act(async () => {
      result.current.saveNow()
    })

    // Advance time to where timeout would have fired
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Should only have saved once (from saveNow)
    expect(mockSaveFunction).toHaveBeenCalledTimes(1)
  })

  it('hasUnsavedChanges returns correct state', () => {
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // Initially no unsaved changes
    expect(result.current.hasUnsavedChanges()).toBe(false)

    // Change data
    rerender({ data: { name: 'updated' } })

    // Now has unsaved changes
    expect(result.current.hasUnsavedChanges()).toBe(true)
  })

  it('uses custom delay', async () => {
    mockSaveFunction.mockResolvedValue(undefined)
    
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 2000, // Custom delay
        enabled: true,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // Change data
    rerender({ data: { name: 'updated' } })

    // Advance time to just before custom delay
    act(() => {
      vi.advanceTimersByTime(1999)
    })

    expect(mockSaveFunction).not.toHaveBeenCalled()

    // Advance past custom delay
    await act(async () => {
      vi.advanceTimersByTime(1)
    })

    expect(mockSaveFunction).toHaveBeenCalled()
  })

  it('handles non-Error objects in save failure', async () => {
    mockSaveFunction.mockRejectedValue('String error')
    
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({
        data,
        saveFunction: mockSaveFunction,
        delay: 1000,
        enabled: true,
        onSaveError: mockOnSaveError,
      }),
      { 
        wrapper: TestWrapper,
        initialProps: { data: { name: 'test' } }
      }
    )

    // Change data
    rerender({ data: { name: 'updated' } })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(mockOnSaveError).toHaveBeenCalledWith(new Error('Save failed'))
  })
})