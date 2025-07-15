import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import type { AppState, ImapAccount, EmailRule, Feed, ProcessingStatus } from '../types'

// Action Types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ACCOUNTS'; payload: ImapAccount[] }
  | { type: 'ADD_ACCOUNT'; payload: ImapAccount }
  | { type: 'UPDATE_ACCOUNT'; payload: ImapAccount }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'SET_RULES'; payload: EmailRule[] }
  | { type: 'ADD_RULE'; payload: EmailRule }
  | { type: 'UPDATE_RULE'; payload: EmailRule }
  | { type: 'DELETE_RULE'; payload: string }
  | { type: 'SET_FEEDS'; payload: Feed[] }
  | { type: 'ADD_FEED'; payload: Feed }
  | { type: 'UPDATE_FEED'; payload: Feed }
  | { type: 'DELETE_FEED'; payload: string }
  | { type: 'SET_PROCESSING_STATUS'; payload: ProcessingStatus | null }

// Initial State
const initialState: AppState = {
  accounts: [],
  rules: [],
  feeds: [],
  processing: null,
  loading: false,
  error: null,
}

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload }
    
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] }
    
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map(account =>
          account.id === action.payload.id ? action.payload : account
        )
      }
    
    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter(account => account.id !== action.payload),
        // Also remove related rules and feeds
        rules: state.rules.filter(rule => rule.imap_account_id !== action.payload),
        feeds: state.feeds.filter(feed => {
          const ruleExists = state.rules.some(rule => 
            rule.id === feed.email_rule_id && rule.imap_account_id !== action.payload
          )
          return ruleExists
        })
      }
    
    case 'SET_RULES':
      return { ...state, rules: action.payload }
    
    case 'ADD_RULE':
      return { ...state, rules: [...state.rules, action.payload] }
    
    case 'UPDATE_RULE':
      return {
        ...state,
        rules: state.rules.map(rule =>
          rule.id === action.payload.id ? action.payload : rule
        )
      }
    
    case 'DELETE_RULE':
      return {
        ...state,
        rules: state.rules.filter(rule => rule.id !== action.payload),
        // Also remove related feeds
        feeds: state.feeds.filter(feed => feed.email_rule_id !== action.payload)
      }
    
    case 'SET_FEEDS':
      return { ...state, feeds: action.payload }
    
    case 'ADD_FEED':
      return { ...state, feeds: [...state.feeds, action.payload] }
    
    case 'UPDATE_FEED':
      return {
        ...state,
        feeds: state.feeds.map(feed =>
          feed.id === action.payload.id ? action.payload : feed
        )
      }
    
    case 'DELETE_FEED':
      return {
        ...state,
        feeds: state.feeds.filter(feed => feed.id !== action.payload)
      }
    
    case 'SET_PROCESSING_STATUS':
      return { ...state, processing: action.payload }
    
    default:
      return state
  }
}

// Context
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Provider
interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

// Hook
export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}

// Selector hooks for convenience
export function useAccounts() {
  const { state } = useAppContext()
  return state.accounts
}

export function useRules() {
  const { state } = useAppContext()
  return state.rules
}

export function useFeeds() {
  const { state } = useAppContext()
  return state.feeds
}

export function useLoading() {
  const { state } = useAppContext()
  return state.loading
}

export function useError() {
  const { state } = useAppContext()
  return state.error
}

export function useProcessingStatus() {
  const { state } = useAppContext()
  return state.processing
}