import { useEffect, useRef, useCallback } from 'react'
import { useToast } from '../components/common/Toast'

interface UseAutoSaveOptions<T> {
  data: T
  saveFunction: (data: T) => Promise<void>
  delay?: number
  enabled?: boolean
  validateFunction?: (data: T) => boolean
  onSaveSuccess?: () => void
  onSaveError?: (error: Error) => void
}

export function useAutoSave<T>({
  data,
  saveFunction,
  delay = 2000,
  enabled = true,
  validateFunction,
  onSaveSuccess,
  onSaveError
}: UseAutoSaveOptions<T>) {
  const toast = useToast()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastSavedRef = useRef<string>()
  const savingRef = useRef(false)

  const save = useCallback(async (dataToSave: T) => {
    if (savingRef.current) return

    // Skip save if validation fails
    if (validateFunction && !validateFunction(dataToSave)) {
      return
    }

    savingRef.current = true
    
    try {
      await saveFunction(dataToSave)
      lastSavedRef.current = JSON.stringify(dataToSave)
      onSaveSuccess?.()
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Save failed')
      onSaveError?.(errorObj)
      toast.error('Auto-save failed', errorObj.message)
    } finally {
      savingRef.current = false
    }
  }, [saveFunction, validateFunction, onSaveSuccess, onSaveError, toast])

  useEffect(() => {
    if (!enabled) return

    const currentDataString = JSON.stringify(data)
    
    // Skip if data hasn't changed
    if (currentDataString === lastSavedRef.current) {
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      save(data)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay, enabled, save])

  // Manual save function
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    save(data)
  }, [data, save])

  // Check if data has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(data) !== lastSavedRef.current
  }, [data])

  return {
    saveNow,
    hasUnsavedChanges,
    isSaving: savingRef.current
  }
}