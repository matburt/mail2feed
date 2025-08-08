use anyhow::{Result, Context};
use async_imap::{Session, types::Fetch};
use crate::db::models::ImapAccount;
use crate::imap::protocol_compat::ProtocolCompat;
use crate::imap::crlf_wrapper::CrlfStreamWrapper;
use chrono::{DateTime, Utc};
use tracing::{debug, info, warn, error};
use futures::StreamExt;
use futures::{AsyncRead, AsyncWrite};
use async_native_tls::{TlsStream, TlsConnector};
use tokio_util::compat::TokioAsyncReadCompatExt;

// Enhanced error handling for async-imap specific errors
#[derive(Debug)]
pub enum ImapClientError {
    ConnectionFailed { host: String, port: u16, source: Box<dyn std::error::Error + Send + Sync> },
    TlsHandshakeFailed { host: String, source: Box<dyn std::error::Error + Send + Sync> },
    AuthenticationFailed { username: String, source: String },
    FolderNotFound { folder: String, available_folders: Vec<String> },
    FolderAccessDenied { folder: String },
    FetchOperationFailed { folder: String, sequence: String, strategy: String },
    ProtocolError { operation: String, details: String },
    ServerCompatibilityIssue { server: String, operation: String },
}

impl std::fmt::Display for ImapClientError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImapClientError::ConnectionFailed { host, port, source } => {
                write!(f, "Failed to connect to IMAP server {}:{} - {}", host, port, source)
            }
            ImapClientError::TlsHandshakeFailed { host, source } => {
                write!(f, "TLS handshake failed with {} - {}", host, source)
            }
            ImapClientError::AuthenticationFailed { username, source } => {
                write!(f, "Authentication failed for user '{}' - {}", username, source)
            }
            ImapClientError::FolderNotFound { folder, available_folders } => {
                write!(f, "Folder '{}' not found. Available folders: {:?}", folder, available_folders)
            }
            ImapClientError::FolderAccessDenied { folder } => {
                write!(f, "Access denied to folder '{}'", folder)
            }
            ImapClientError::FetchOperationFailed { folder, sequence, strategy } => {
                write!(f, "Failed to fetch messages from folder '{}' (sequence: {}, strategy: {})", folder, sequence, strategy)
            }
            ImapClientError::ProtocolError { operation, details } => {
                write!(f, "IMAP protocol error during '{}' - {}", operation, details)
            }
            ImapClientError::ServerCompatibilityIssue { server, operation } => {
                write!(f, "Server compatibility issue with '{}' during '{}' - server may not fully support IMAP protocol", server, operation)
            }
        }
    }
}

impl std::error::Error for ImapClientError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ImapClientError::ConnectionFailed { source, .. } => Some(source.as_ref()),
            ImapClientError::TlsHandshakeFailed { source, .. } => Some(source.as_ref()),
            _ => None,
        }
    }
}

// ImapClientError automatically converts to anyhow::Error via the StdError trait

pub struct ImapClient {
    account: ImapAccount,
}

impl ImapClient {
    pub fn new(account: &ImapAccount) -> Result<Self> {
        Ok(Self {
            account: account.clone(),
        })
    }
    
    pub async fn test_connection(&self) -> Result<()> {
        debug!("Testing connection to {}:{} (TLS: {})", 
            self.account.host, self.account.port, self.account.use_tls);
            
        if self.account.use_tls {
            let mut session = self.connect_tls().await
                .context("Failed to establish TLS connection")?;
            
            // Try a NOOP command first to test basic connectivity
            session.noop().await
                .context("Failed to execute NOOP command - server may not support IMAP properly")?;
                
            // Then try listing folders
            let _ = session.list(Some(""), Some("*")).await
                .context("Failed to list folders - check if the server requires specific folder prefixes")?;
                
            // Logout (but don't fail the test if logout has issues)
            if let Err(e) = session.logout().await {
                warn!("Logout failed (this is usually not critical): {}", e);
            }
        } else {
            let mut session = self.connect_plain().await
                .context("Failed to establish plain connection")?;
                
            // Try a NOOP command first to test basic connectivity
            session.noop().await
                .context("Failed to execute NOOP command - server may not support IMAP properly")?;
                
            // Then try listing folders
            let _ = session.list(Some(""), Some("*")).await
                .context("Failed to list folders - check if the server requires specific folder prefixes")?;
                
            // Logout (but don't fail the test if logout has issues)
            if let Err(e) = session.logout().await {
                warn!("Logout failed (this is usually not critical): {}", e);
            }
        }
        
        debug!("Connection test successful");
        Ok(())
    }

    async fn connect_tls(&self) -> Result<Session<CrlfStreamWrapper<TlsStream<tokio_util::compat::Compat<tokio::net::TcpStream>>>>> {
        debug!("Creating TLS connection to {}:{}", self.account.host, self.account.port);
        
        // Create async TLS connector
        let tls_connector = TlsConnector::default();
        
        // Connect to TCP stream first and make it compatible
        let tcp_stream = tokio::net::TcpStream::connect((self.account.host.as_str(), self.account.port as u16))
            .await
            .map_err(|e| {
                error!("TLS TCP connection failed: {}", e);
                ImapClientError::ConnectionFailed {
                    host: self.account.host.clone(),
                    port: self.account.port as u16,
                    source: Box::new(e),
                }
            })?
            .compat();
            
        // Wrap with TLS
        let tls_stream = tls_connector.connect(&self.account.host, tcp_stream)
            .await
            .map_err(|e| {
                error!("TLS handshake failed: {}", e);
                ImapClientError::TlsHandshakeFailed {
                    host: self.account.host.clone(),
                    source: Box::new(e),
                }
            })?;
            
        // Always use CRLF wrapper but configure it appropriately
        let wrapped_stream = if ProtocolCompat::is_protonmail_bridge(&self.account.host, self.account.port as u16) {
            info!("Detected ProtonMail Bridge - applying CRLF compatibility wrapper");
            CrlfStreamWrapper::new(tls_stream)
        } else {
            CrlfStreamWrapper::new_passthrough(tls_stream)
        };
        
        let client = async_imap::Client::new(wrapped_stream);
        
        debug!("TLS connection established, attempting login");
        
        let session = client
            .login(&self.account.username, &self.account.password)
            .await
            .map_err(|e| {
                error!("Login failed: {:?}", e.0);
                ImapClientError::AuthenticationFailed {
                    username: self.account.username.clone(),
                    source: format!("{:?}. Check username and password. If using Gmail, ensure you're using an app-specific password.", e.0),
                }
            })?;
            
        debug!("Login successful");
        Ok(session)
    }

    async fn connect_plain(&self) -> Result<Session<CrlfStreamWrapper<tokio_util::compat::Compat<tokio::net::TcpStream>>>> {
        debug!("Creating plain connection to {}:{}", self.account.host, self.account.port);
        
        let stream = tokio::net::TcpStream::connect((self.account.host.as_str(), self.account.port as u16))
            .await
            .map_err(|e| {
                error!("TCP connection failed: {}", e);
                ImapClientError::ConnectionFailed {
                    host: self.account.host.clone(),
                    port: self.account.port as u16,
                    source: Box::new(e),
                }
            })?
            .compat();
            
        // Always use CRLF wrapper but configure it appropriately
        let wrapped_stream = if ProtocolCompat::is_protonmail_bridge(&self.account.host, self.account.port as u16) {
            info!("Detected ProtonMail Bridge - applying CRLF compatibility wrapper for plain connection");
            CrlfStreamWrapper::new(stream)
        } else {
            CrlfStreamWrapper::new_passthrough(stream)
        };
        
        let client = async_imap::Client::new(wrapped_stream);
        
        debug!("Plain connection established, attempting login");
        
        let session = client
            .login(&self.account.username, &self.account.password)
            .await
            .map_err(|e| {
                error!("Login failed: {:?}", e.0);
                ImapClientError::AuthenticationFailed {
                    username: self.account.username.clone(),
                    source: format!("{:?}. Check username and password.", e.0),
                }
            })?;
            
        debug!("Login successful");
        Ok(session)
    }
    
    pub async fn list_folders(&self) -> Result<Vec<String>> {
        debug!("Listing folders for account: {}", self.account.name);
        
        let folders = if self.account.use_tls {
            let mut session = self.connect_tls().await?;
            self.list_folders_with_session(&mut session).await?
        } else {
            let mut session = self.connect_plain().await?;
            self.list_folders_with_session(&mut session).await?
        };
        
        if folders.is_empty() {
            warn!("No folders found - this might indicate a configuration issue");
        }
        
        Ok(folders)
    }
    
    // Helper method to list folders with a given session to avoid borrow checker issues
    async fn list_folders_with_session<T>(&self, session: &mut async_imap::Session<CrlfStreamWrapper<T>>) -> Result<Vec<String>>
    where 
        T: AsyncRead + AsyncWrite + Unpin + Send + std::fmt::Debug
    {
        // Try first approach
        if let Ok(folders) = self.try_list_folders_empty(session).await {
            if !folders.is_empty() {
                if let Err(e) = session.logout().await {
                    warn!("Logout failed after listing folders: {}", e);
                }
                return Ok(folders);
            }
        }
        
        // Try second approach
        if let Ok(folders) = self.try_list_folders_inbox(session).await {
            if !folders.is_empty() {
                if let Err(e) = session.logout().await {
                    warn!("Logout failed after listing folders: {}", e);
                }
                return Ok(folders);
            }
        }
        
        // Try third approach
        if let Ok(folders) = self.try_list_folders_none(session).await {
            if let Err(e) = session.logout().await {
                warn!("Logout failed after listing folders: {}", e);
            }
            return Ok(folders);
        }
        
        if let Err(e) = session.logout().await {
            warn!("Logout failed after listing folders: {}", e);
        }
        
        Err(anyhow::anyhow!("Failed to list folders with any prefix combination"))
    }
    
    async fn try_list_folders_empty<T>(&self, session: &mut async_imap::Session<CrlfStreamWrapper<T>>) -> Result<Vec<String>>
    where 
        T: AsyncRead + AsyncWrite + Unpin + Send + std::fmt::Debug
    {
        let names_stream = session.list(Some(""), Some("*")).await?;
        let names: Vec<_> = names_stream.collect().await;
        let folders: Vec<String> = names
            .into_iter()
            .filter_map(|result| match result {
                Ok(name) => Some(name.name().to_string()),
                Err(e) => {
                    warn!("Error parsing folder name: {}", e);
                    None
                }
            })
            .collect();
        debug!("Found {} folders with empty prefix", folders.len());
        Ok(folders)
    }
    
    async fn try_list_folders_inbox<T>(&self, session: &mut async_imap::Session<CrlfStreamWrapper<T>>) -> Result<Vec<String>>
    where 
        T: AsyncRead + AsyncWrite + Unpin + Send + std::fmt::Debug
    {
        warn!("Failed to list with empty prefix, trying INBOX prefix");
        let names_stream = session.list(Some("INBOX"), Some("*")).await?;
        let names: Vec<_> = names_stream.collect().await;
        let folders: Vec<String> = names
            .into_iter()
            .filter_map(|result| match result {
                Ok(name) => Some(name.name().to_string()),
                Err(e) => {
                    warn!("Error parsing folder name: {}", e);
                    None
                }
            })
            .collect();
        debug!("Found {} folders with INBOX prefix", folders.len());
        Ok(folders)
    }
    
    async fn try_list_folders_none<T>(&self, session: &mut async_imap::Session<CrlfStreamWrapper<T>>) -> Result<Vec<String>>
    where 
        T: AsyncRead + AsyncWrite + Unpin + Send + std::fmt::Debug
    {
        warn!("Failed to list with INBOX prefix, trying without prefix");
        let names_stream = session.list(None, Some("*")).await?;
        let names: Vec<_> = names_stream.collect().await;
        let folders: Vec<String> = names
            .into_iter()
            .filter_map(|result| match result {
                Ok(name) => Some(name.name().to_string()),
                Err(e) => {
                    warn!("Error parsing folder name: {}", e);
                    None
                }
            })
            .collect();
        debug!("Found {} folders with no prefix", folders.len());
        Ok(folders)
    }
    
    pub async fn fetch_emails_from_folder(&self, folder: &str, limit: Option<u32>) -> Result<Vec<Email>> {
        if self.account.use_tls {
            self.fetch_emails_tls(folder, limit).await
        } else {
            self.fetch_emails_plain(folder, limit).await
        }
    }
    
    // Helper method to try multiple IMAP fetch strategies with fallback
    async fn fetch_messages_with_fallback<T>(&self, session: &mut async_imap::Session<CrlfStreamWrapper<T>>, sequence_set: &str) -> Result<Vec<async_imap::types::Fetch>>
    where 
        T: AsyncRead + AsyncWrite + Unpin + Send + std::fmt::Debug
    {
        // Check if this is ProtonMail Bridge and use special handling
        if ProtocolCompat::is_protonmail_bridge(&self.account.host, self.account.port as u16) {
            info!("Detected ProtonMail Bridge connection, using compatibility mode");
            
            // First, gather debugging information
            if let Err(e) = ProtocolCompat::debug_server_info(session).await {
                warn!("Failed to gather server debug info: {}", e);
            }
            
            // Try ProtonMail-specific fetch strategies
            return ProtocolCompat::protonmail_compatible_fetch(session, sequence_set).await;
        }
        // Strategy 1: Try headers only first (most compatible)
        info!("Attempting fetch strategy 1: Headers only");
        match session.fetch(sequence_set, "RFC822.HEADER FLAGS UID").await {
            Ok(mut stream) => {
                // Manually collect with timeout per item to avoid hanging
                let mut messages: Vec<async_imap::types::Fetch> = Vec::new();
                let timeout_duration = std::time::Duration::from_secs(5);
                
                info!("Starting manual stream collection with per-item timeout");
                loop {
                    match tokio::time::timeout(timeout_duration, stream.next()).await {
                        Ok(Some(Ok(message))) => {
                            messages.push(message);
                            debug!("Collected message {}", messages.len());
                        }
                        Ok(Some(Err(e))) => {
                            warn!("Error in stream item: {}", e);
                            break;
                        }
                        Ok(None) => {
                            info!("Stream ended normally, collected {} messages", messages.len());
                            break;
                        }
                        Err(_) => {
                            warn!("Stream item timed out after 5 seconds, collected {} messages so far", messages.len());
                            break;
                        }
                    }
                }
                
                if !messages.is_empty() {
                    info!("Successfully fetched {} messages with headers only", messages.len());
                    return Ok(messages);
                } else {
                    warn!("Strategy 1 returned no valid messages");
                }
            },
            Err(e) => {
                warn!("Strategy 1 failed: {}", e);
            }
        }
        
        // Strategy 2: Try with BODY.PEEK instead of RFC822.TEXT (read-only access)
        info!("Attempting fetch strategy 2: Headers with BODY.PEEK");
        match session.fetch(sequence_set, "RFC822.HEADER BODY.PEEK[] FLAGS UID").await {
            Ok(stream) => {
                let timeout_duration = std::time::Duration::from_secs(30);
                match tokio::time::timeout(timeout_duration, stream.collect::<Vec<_>>()).await {
                    Ok(results) => {
                        let messages: Vec<_> = results.into_iter().filter_map(|r| r.ok()).collect();
                        if !messages.is_empty() {
                            info!("Successfully fetched {} messages with BODY.PEEK", messages.len());
                            return Ok(messages);
                        } else {
                            warn!("Strategy 2 returned no valid messages");
                        }
                    }
                    Err(_) => {
                        warn!("Strategy 2 timed out after 30 seconds");
                    }
                }
            },
            Err(e) => {
                warn!("Strategy 2 failed: {}", e);
            }
        }
        
        // Strategy 3: Try basic FLAGS only
        info!("Attempting fetch strategy 3: FLAGS only");
        match session.fetch(sequence_set, "FLAGS UID").await {
            Ok(stream) => {
                let timeout_duration = std::time::Duration::from_secs(30);
                match tokio::time::timeout(timeout_duration, stream.collect::<Vec<_>>()).await {
                    Ok(results) => {
                        let messages: Vec<_> = results.into_iter().filter_map(|r| r.ok()).collect();
                        if !messages.is_empty() {
                            info!("Successfully fetched {} messages with FLAGS only", messages.len());
                            return Ok(messages);
                        } else {
                            warn!("Strategy 3 returned no valid messages");
                        }
                    }
                    Err(_) => {
                        warn!("Strategy 3 timed out after 30 seconds");
                    }
                }
            },
            Err(e) => {
                warn!("Strategy 3 failed: {}", e);
            }
        }
        
        // Strategy 4: Try fetching individual messages by UID (most compatible but slower)
        info!("Attempting fetch strategy 4: Individual UID fetch");
        // First get the UIDs using SEARCH ALL command
        match session.search("ALL").await {
            Ok(uids) => {
                if !uids.is_empty() {
                    // Take only the first few UIDs to avoid overwhelming the server
                    let limited_uids: Vec<u32> = uids.into_iter().take(5).collect();
                    info!("Found {} UIDs, fetching first {} individually", limited_uids.len(), limited_uids.len());
                    
                    // Try to fetch just one UID to test
                    let first_uid = limited_uids[0];
                    match session.uid_fetch(format!("{}", first_uid), "FLAGS UID").await {
                        Ok(stream) => {
                            let timeout_duration = std::time::Duration::from_secs(30);
                            match tokio::time::timeout(timeout_duration, stream.collect::<Vec<_>>()).await {
                                Ok(results) => {
                                    let messages: Vec<_> = results.into_iter().filter_map(|r| r.ok()).collect();
                                    if !messages.is_empty() {
                                        info!("Successfully fetched message UID {} with individual fetch", first_uid);
                                        return Ok(messages);
                                    } else {
                                        warn!("Strategy 4 returned no valid messages");
                                    }
                                }
                                Err(_) => {
                                    warn!("Strategy 4 timed out after 30 seconds");
                                }
                            }
                        },
                        Err(e) => {
                            warn!("Strategy 4 individual UID fetch failed: {}", e);
                        }
                    }
                }
            },
            Err(e) => {
                warn!("Strategy 4 SEARCH ALL failed: {}", e);
            }
        }
        
        // All strategies failed - log the issue and return enhanced error
        error!("All IMAP fetch strategies failed for sequence '{}' - server may have protocol compatibility issues", sequence_set);
        warn!("This appears to be a protocol compatibility issue where the server sends responses that don't conform to expected IMAP format");
        warn!("The server connection, authentication, folder selection, and SEARCH commands work correctly");
        warn!("However, all FETCH command variants return 'Unable to parse status response'");
        warn!("This may require using a different IMAP client library or adjusting server configuration");
        
        Err(ImapClientError::ServerCompatibilityIssue {
            server: self.account.host.clone(),
            operation: format!("FETCH {}", sequence_set),
        }.into())
    }
    
    async fn fetch_emails_tls(&self, folder: &str, limit: Option<u32>) -> Result<Vec<Email>> {
        let mut session = self.connect_tls().await?;
        
        // Select the folder
        info!("Attempting to select folder: '{}'", folder);
        let mailbox = match session.select(folder).await {
            Ok(mailbox) => {
                info!("Successfully selected folder '{}', {} messages found", folder, mailbox.exists);
                mailbox
            },
            Err(e) => {
                // If folder selection fails, try to list available folders for debugging
                error!("Failed to select folder '{}': {}", folder, e);
                if let Ok(available_folders) = self.list_folders().await {
                    warn!("Available folders ({} total): {:?}", available_folders.len(), available_folders);
                    let suggestions: Vec<&String> = available_folders
                        .iter()
                        .filter(|f| f.to_lowercase().contains(&folder.to_lowercase()) || 
                                   folder.to_lowercase().contains(&f.to_lowercase()))
                        .collect();
                    if !suggestions.is_empty() {
                        warn!("Possible folder matches: {:?}", suggestions);
                    } else {
                        warn!("No similar folder names found");
                    }
                    
                    return Err(ImapClientError::FolderNotFound {
                        folder: folder.to_string(),
                        available_folders: available_folders,
                    }.into());
                } else {
                    error!("Could not list folders to provide suggestions");
                    return Err(ImapClientError::FolderAccessDenied {
                        folder: folder.to_string(),
                    }.into());
                }
            }
        };
        let total_messages = mailbox.exists;
        
        if total_messages == 0 {
            session.logout().await?;
            return Ok(vec![]);
        }
        
        // Use conservative fetch settings for better compatibility
        let fetch_count = limit.unwrap_or(10).min(total_messages).min(10); // Limit to 10 messages max
        let start = if total_messages > fetch_count {
            total_messages - fetch_count + 1
        } else {
            1
        };
        
        let sequence_set = format!("{}:{}", start, total_messages);
        info!("Fetching messages: sequence_set='{}', limit={:?}, total_messages={}", sequence_set, limit, total_messages);
        
        // Try multiple fetch strategies in order of preference
        let messages = self.fetch_messages_with_fallback(&mut session, &sequence_set).await?;
        
        let mut emails = Vec::new();
        
        for message in messages.iter() {
            if let Ok(email) = parse_email(message) {
                emails.push(email);
            }
        }
        
        // Sort by date, newest first
        emails.sort_by(|a, b| b.date.cmp(&a.date));
        
        session.logout().await?;
        Ok(emails)
    }
    
    async fn fetch_emails_plain(&self, folder: &str, limit: Option<u32>) -> Result<Vec<Email>> {
        let mut session = self.connect_plain().await?;
        
        // Select the folder
        info!("Attempting to select folder: '{}'", folder);
        let mailbox = match session.select(folder).await {
            Ok(mailbox) => {
                info!("Successfully selected folder '{}', {} messages found", folder, mailbox.exists);
                mailbox
            },
            Err(e) => {
                // If folder selection fails, try to list available folders for debugging
                error!("Failed to select folder '{}': {}", folder, e);
                if let Ok(available_folders) = self.list_folders().await {
                    warn!("Available folders ({} total): {:?}", available_folders.len(), available_folders);
                    let suggestions: Vec<&String> = available_folders
                        .iter()
                        .filter(|f| f.to_lowercase().contains(&folder.to_lowercase()) || 
                                   folder.to_lowercase().contains(&f.to_lowercase()))
                        .collect();
                    if !suggestions.is_empty() {
                        warn!("Possible folder matches: {:?}", suggestions);
                    } else {
                        warn!("No similar folder names found");
                    }
                } else {
                    error!("Could not list folders to provide suggestions");
                }
                return Err(anyhow::anyhow!("Failed to select folder '{}' - it may not exist or be inaccessible: {}", folder, e));
            }
        };
        let total_messages = mailbox.exists;
        
        if total_messages == 0 {
            session.logout().await?;
            return Ok(vec![]);
        }
        
        // Use conservative fetch settings for better compatibility
        let fetch_count = limit.unwrap_or(10).min(total_messages).min(10); // Limit to 10 messages max
        let start = if total_messages > fetch_count {
            total_messages - fetch_count + 1
        } else {
            1
        };
        
        let sequence_set = format!("{}:{}", start, total_messages);
        info!("Fetching messages: sequence_set='{}', limit={:?}, total_messages={}", sequence_set, limit, total_messages);
        
        // Try multiple fetch strategies in order of preference
        let messages = self.fetch_messages_with_fallback(&mut session, &sequence_set).await?;
        
        let mut emails = Vec::new();
        
        for message in messages.iter() {
            if let Ok(email) = parse_email(message) {
                emails.push(email);
            }
        }
        
        // Sort by date, newest first
        emails.sort_by(|a, b| b.date.cmp(&a.date));
        
        session.logout().await?;
        Ok(emails)
    }
    
    #[allow(dead_code)]
    pub async fn search_emails(&self, _folder: &str, _query: &str) -> Result<Vec<Email>> {
        // Search methods disabled for now - not currently used and need full async conversion
        // Return empty result to avoid compilation errors
        warn!("Search functionality not yet implemented for async-imap - returning empty results");
        Ok(vec![])
    }
}

fn parse_email(fetch: &Fetch) -> Result<Email> {
    let uid = fetch.uid.ok_or_else(|| anyhow::anyhow!("Message has no UID"))?;
    
    let mut subject = String::new();
    let mut from = String::new();
    let mut to = String::new();
    let mut date = Utc::now();
    let mut message_id = String::new();
    let mut body = String::new();
    
    // Parse headers if available
    if let Some(header_data) = fetch.header() {
        let header_str = String::from_utf8_lossy(header_data);
        
        // Simple header parsing
        for line in header_str.lines() {
            if line.starts_with("Subject: ") {
                subject = line.strip_prefix("Subject: ").unwrap_or("").to_string();
            } else if line.starts_with("From: ") {
                from = line.strip_prefix("From: ").unwrap_or("").to_string();
            } else if line.starts_with("To: ") {
                to = line.strip_prefix("To: ").unwrap_or("").to_string();
            } else if line.starts_with("Date: ") {
                let date_str = line.strip_prefix("Date: ").unwrap_or("");
                // Try to parse the date
                if let Ok(parsed_date) = DateTime::parse_from_rfc2822(date_str) {
                    date = parsed_date.with_timezone(&Utc);
                }
            } else if line.starts_with("Message-ID: ") {
                message_id = line.strip_prefix("Message-ID: ").unwrap_or("").to_string();
            }
        }
    }
    
    // Parse body if available
    if let Some(body_data) = fetch.text() {
        body = String::from_utf8_lossy(body_data).to_string();
    } else {
        // If no body is available, use a placeholder
        body = "[Body not available - fetched headers only]".to_string();
    }
    
    // Check if email is seen
    let is_seen = fetch.flags().any(|flag| matches!(flag, async_imap::types::Flag::Seen));
    
    // If we don't have basic email info, generate defaults
    if subject.is_empty() && from.is_empty() && message_id.is_empty() {
        subject = format!("[Email UID: {}]", uid);
        from = "[Unknown sender]".to_string();
        message_id = format!("<uid-{}>", uid);
    }
    
    Ok(Email {
        uid,
        message_id,
        subject,
        from,
        to,
        date,
        body,
        is_seen,
    })
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Email {
    pub uid: u32,
    pub message_id: String,
    pub subject: String,
    pub from: String,
    pub to: String,
    pub date: DateTime<Utc>,
    pub body: String,
    pub is_seen: bool,
}