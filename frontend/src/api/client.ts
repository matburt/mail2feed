// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Generic API response type
interface ApiResponse<T = any> {
  data?: T
  error?: string
}

// HTTP methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

// Request options
interface RequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: any
}

// Base fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body } = options

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }

  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, config)
    
    // Handle different content types
    const contentType = response.headers.get('content-type')
    let data: any
    
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      // Handle API error responses
      const errorMessage = data?.error || data || `HTTP ${response.status}: ${response.statusText}`
      throw new ApiError(errorMessage, response.status, data)
    }

    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Network error - please check your connection and that the backend is running', 0)
    }
    
    throw new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0
    )
  }
}

// API client methods
export const apiClient = {
  // Generic CRUD operations
  get: <T>(endpoint: string) => apiFetch<T>(endpoint),
  
  post: <T>(endpoint: string, data: any) => 
    apiFetch<T>(endpoint, { method: 'POST', body: data }),
  
  put: <T>(endpoint: string, data: any) => 
    apiFetch<T>(endpoint, { method: 'PUT', body: data }),
  
  delete: <T>(endpoint: string) => 
    apiFetch<T>(endpoint, { method: 'DELETE' }),

  // Health check
  health: () => apiFetch<{ status: string; database: string }>('/health'),
}

// Response wrapper for consistent error handling
export async function handleApiCall<T>(
  apiCall: () => Promise<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await apiCall()
    return { data, error: null }
  } catch (error) {
    if (error instanceof ApiError) {
      return { data: null, error: error.message }
    }
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export default apiClient