import { useState, useEffect, useCallback, useRef } from 'react'
import { accountsApi } from '../api/accounts'
import type { ConnectionTestResult } from '../types'

// Fallback folders to use when IMAP fails or is loading
const FALLBACK_FOLDERS = [
  'INBOX',
  'Sent',
  'Drafts',
  'Spam',
  'Trash',
  'Archive',
  'Important'
]

// Cache configuration
const CACHE_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes
const DEBOUNCE_DELAY_MS = 500

interface CachedFolders {
  folders: string[]
  timestamp: number
}

interface FolderLoaderState {
  folders: string[]
  isLoading: boolean
  error: string | null
}

export interface UseFolderLoaderReturn {
  folders: string[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  clearCache: () => void
}

/**
 * Custom hook for loading IMAP folders with caching and fallback support
 * 
 * @param accountId - IMAP account ID to fetch folders for
 * @returns Object with folders, loading state, error state, and control functions
 */
export const useFolderLoader = (accountId?: string): UseFolderLoaderReturn => {
  const [state, setState] = useState<FolderLoaderState>({
    folders: FALLBACK_FOLDERS,
    isLoading: false,
    error: null
  })

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cache key for session storage
  const getCacheKey = useCallback((id: string) => `imap_folders_${id}`, [])

  // Check if cached data is still valid
  const isCacheValid = useCallback((cachedData: CachedFolders): boolean => {
    const now = Date.now()
    return (now - cachedData.timestamp) < CACHE_EXPIRY_MS
  }, [])

  // Get folders from cache
  const getCachedFolders = useCallback((id: string): string[] | null => {
    try {
      const cached = sessionStorage.getItem(getCacheKey(id))
      if (!cached) return null

      const cachedData: CachedFolders = JSON.parse(cached)
      if (isCacheValid(cachedData)) {
        return cachedData.folders
      } else {
        // Clean up expired cache
        sessionStorage.removeItem(getCacheKey(id))
        return null
      }
    } catch (error) {
      console.warn('Failed to read folder cache:', error)
      return null
    }
  }, [getCacheKey, isCacheValid])

  // Save folders to cache
  const cacheFolders = useCallback((id: string, folders: string[]): void => {
    try {
      const cacheData: CachedFolders = {
        folders,
        timestamp: Date.now()
      }
      sessionStorage.setItem(getCacheKey(id), JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache folders:', error)
    }
  }, [getCacheKey])

  // Clear cache for specific account
  const clearCache = useCallback(() => {
    if (accountId) {
      try {
        sessionStorage.removeItem(getCacheKey(accountId))
      } catch (error) {
        console.warn('Failed to clear folder cache:', error)
      }
    }
  }, [accountId, getCacheKey])

  // Fetch folders from API
  const fetchFolders = useCallback(async (id: string): Promise<void> => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response: ConnectionTestResult = await accountsApi.testConnection(id)
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      if (response.success && response.folders && response.folders.length > 0) {
        // Success: use real folders
        const folders = response.folders
        cacheFolders(id, folders)
        setState(prev => ({
          ...prev,
          folders,
          isLoading: false,
          error: null
        }))
      } else {
        // API succeeded but no folders or connection failed
        const errorMsg = response.error || 'No folders found or connection failed'
        console.warn('IMAP folder fetch failed:', errorMsg)
        
        // Try cached folders first, then fallback
        const cachedFolders = getCachedFolders(id)
        const folders = cachedFolders || FALLBACK_FOLDERS
        
        setState(prev => ({
          ...prev,
          folders,
          isLoading: false,
          error: cachedFolders ? null : errorMsg
        }))
      }
    } catch (error) {
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch folders'
      console.error('IMAP folder fetch error:', error)
      
      // Try cached folders first, then fallback
      const cachedFolders = getCachedFolders(id)
      const folders = cachedFolders || FALLBACK_FOLDERS
      
      setState(prev => ({
        ...prev,
        folders,
        isLoading: false,
        error: cachedFolders ? null : errorMsg
      }))
    }
  }, [cacheFolders, getCachedFolders])

  // Debounced fetch function
  const debouncedFetch = useCallback((id: string) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchFolders(id)
    }, DEBOUNCE_DELAY_MS)
  }, [fetchFolders])

  // Manual refetch function
  const refetch = useCallback(() => {
    if (accountId) {
      clearCache()
      fetchFolders(accountId)
    }
  }, [accountId, clearCache, fetchFolders])

  // Main effect: fetch folders when accountId changes
  useEffect(() => {
    if (!accountId) {
      // No account selected, use fallback folders
      setState({
        folders: FALLBACK_FOLDERS,
        isLoading: false,
        error: null
      })
      return
    }

    // Check cache first
    const cachedFolders = getCachedFolders(accountId)
    if (cachedFolders) {
      setState({
        folders: cachedFolders,
        isLoading: false,
        error: null
      })
      return
    }

    // No cache hit, fetch from API with debouncing
    debouncedFetch(accountId)

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [accountId, getCachedFolders, debouncedFetch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    folders: state.folders,
    isLoading: state.isLoading,
    error: state.error,
    refetch,
    clearCache
  }
}