// API Response Types
export interface ApiResponse<T> {
  data?: T
  error?: string
}

// IMAP Account Types
export interface ImapAccount {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
  use_tls: boolean
  created_at: string
  updated_at: string
}

export interface CreateImapAccountRequest {
  name: string
  host: string
  port: number
  username: string
  password: string
  use_tls: boolean
}

export interface UpdateImapAccountRequest extends CreateImapAccountRequest {}

// Email Rule Types
export interface EmailRule {
  id: string
  name: string
  imap_account_id: string
  folder: string
  to_address?: string
  from_address?: string
  subject_contains?: string
  label?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateEmailRuleRequest {
  name: string
  imap_account_id: string
  folder: string
  to_address?: string
  from_address?: string
  subject_contains?: string
  label?: string
  is_active: boolean
}

export interface UpdateEmailRuleRequest extends CreateEmailRuleRequest {}

// Feed Types
export interface Feed {
  id: string
  title: string
  description?: string
  link?: string
  email_rule_id: string
  feed_type: 'rss' | 'atom'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateFeedRequest {
  title: string
  description?: string
  link?: string
  email_rule_id: string
  feed_type: string
  is_active: boolean
}

export interface UpdateFeedRequest extends CreateFeedRequest {}

// Feed Item Types
export interface FeedItem {
  id: string
  feed_id: string
  title: string
  description?: string
  link?: string
  author?: string
  pub_date: string
  email_message_id?: string
  email_subject?: string
  email_from?: string
  email_body?: string
  created_at: string
}

// Processing Types
export interface ProcessingStatus {
  total_emails_processed: number
  new_feed_items_created: number
  errors: string[]
}

// Connection Test Types
export interface ConnectionTestResult {
  success: boolean
  folders?: string[]
  error?: string
}

// App State Types
export interface AppState {
  accounts: ImapAccount[]
  rules: EmailRule[]
  feeds: Feed[]
  processing: ProcessingStatus | null
  loading: boolean
  error: string | null
}

// UI State Types
export interface LoadingState {
  [key: string]: boolean
}

export interface ErrorState {
  [key: string]: string | null
}