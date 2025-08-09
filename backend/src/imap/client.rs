use anyhow::{Result, Context};
use crate::db::models::ImapAccount;
use chrono::{DateTime, Utc};
use tracing::{debug, info, warn, error};
use native_tls::TlsConnector;
use std::net::TcpStream;

// Enhanced error handling for IMAP specific errors
#[derive(Debug)]
pub enum ImapClientError {
    ConnectionFailed { host: String, port: u16, source: Box<dyn std::error::Error + Send + Sync> },
    TlsHandshakeFailed { host: String, source: Box<dyn std::error::Error + Send + Sync> },
    AuthenticationFailed { username: String, source: String },
    #[allow(dead_code)]
    FolderNotFound { folder: String, available_folders: Vec<String> },
    #[allow(dead_code)]
    FolderAccessDenied { folder: String },
    #[allow(dead_code)]
    FetchOperationFailed { folder: String, sequence: String, strategy: String },
    #[allow(dead_code)]
    ProtocolError { operation: String, details: String },
    #[allow(dead_code)]
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
        let account = self.account.clone();
        
        tokio::task::spawn_blocking(move || {
            debug!("Testing connection to {}:{} (TLS: {})", 
                account.host, account.port, account.use_tls);
                
            if account.use_tls {
                let mut session = Self::connect_tls_sync(&account)?;
                
                // Try a NOOP command first to test basic connectivity
                session.noop()
                    .context("Failed to execute NOOP command - server may not support IMAP properly")?;
                    
                // Then try listing folders
                let _ = session.list(Some(""), Some("*"))
                    .context("Failed to list folders - check if the server requires specific folder prefixes")?;
                    
                // Logout (but don't fail the test if logout has issues)
                if let Err(e) = session.logout() {
                    warn!("Logout failed (this is usually not critical): {}", e);
                }
            } else {
                let mut session = Self::connect_plain_sync(&account)?;
                    
                // Try a NOOP command first to test basic connectivity
                session.noop()
                    .context("Failed to execute NOOP command - server may not support IMAP properly")?;
                    
                // Then try listing folders
                let _ = session.list(Some(""), Some("*"))
                    .context("Failed to list folders - check if the server requires specific folder prefixes")?;
                    
                // Logout (but don't fail the test if logout has issues)
                if let Err(e) = session.logout() {
                    warn!("Logout failed (this is usually not critical): {}", e);
                }
            }
            
            debug!("Connection test successful");
            Ok(())
        })
        .await
        .unwrap()
    }

    fn connect_tls_sync(account: &ImapAccount) -> Result<imap::Session<native_tls::TlsStream<TcpStream>>> {
        debug!("Creating TLS connection to {}:{}", account.host, account.port);
        
        let tls = TlsConnector::builder().build()
            .map_err(|e| {
                error!("TLS connector creation failed: {}", e);
                ImapClientError::TlsHandshakeFailed {
                    host: account.host.clone(),
                    source: Box::new(e),
                }
            })?;
            
        let client = imap::connect_starttls((account.host.as_str(), account.port as u16), &account.host, &tls)
            .map_err(|e| {
                error!("TLS connection failed: {}", e);
                ImapClientError::ConnectionFailed {
                    host: account.host.clone(),
                    port: account.port as u16,
                    source: Box::new(e),
                }
            })?;
            
        debug!("TLS connection established, attempting login");
        
        let session = client
            .login(&account.username, &account.password)
            .map_err(|e| {
                error!("Login failed: {:?}", e.0);
                ImapClientError::AuthenticationFailed {
                    username: account.username.clone(),
                    source: format!("{:?}. Check username and password. If using Gmail, ensure you're using an app-specific password.", e.0),
                }
            })?;
            
        debug!("Login successful");
        Ok(session)
    }

    fn connect_plain_sync(account: &ImapAccount) -> Result<imap::Session<TcpStream>> {
        debug!("Creating plain connection to {}:{}", account.host, account.port);
        
        // For plain IMAP connections, we need to construct the client manually
        let tcp_stream = TcpStream::connect((account.host.as_str(), account.port as u16))
            .map_err(|e| {
                error!("TCP connection failed: {}", e);
                ImapClientError::ConnectionFailed {
                    host: account.host.clone(),
                    port: account.port as u16,
                    source: Box::new(e),
                }
            })?;
            
        let client = imap::Client::new(tcp_stream);
            
        debug!("Plain connection established, attempting login");
        
        let session = client
            .login(&account.username, &account.password)
            .map_err(|e| {
                error!("Login failed: {:?}", e.0);
                ImapClientError::AuthenticationFailed {
                    username: account.username.clone(),
                    source: format!("{:?}. Check username and password.", e.0),
                }
            })?;
            
        debug!("Login successful");
        Ok(session)
    }
    
    pub async fn list_folders(&self) -> Result<Vec<String>> {
        debug!("Listing folders for account: {}", self.account.name);
        
        let account = self.account.clone();
        
        tokio::task::spawn_blocking(move || {
            let folders = if account.use_tls {
                let mut session = Self::connect_tls_sync(&account)?;
                Self::list_folders_with_session(&mut session)?
            } else {
                let mut session = Self::connect_plain_sync(&account)?;
                Self::list_folders_with_session(&mut session)?
            };
            
            if folders.is_empty() {
                warn!("No folders found - this might indicate a configuration issue");
            }
            
            Ok(folders)
        })
        .await
        .unwrap()
    }
    
    fn list_folders_with_session<T>(session: &mut imap::Session<T>) -> Result<Vec<String>>
    where 
        T: std::io::Read + std::io::Write
    {
        // Try first approach
        if let Ok(folders) = Self::try_list_folders_empty(session) {
            if !folders.is_empty() {
                if let Err(e) = session.logout() {
                    warn!("Logout failed after listing folders: {}", e);
                }
                return Ok(folders);
            }
        }
        
        // Try second approach
        if let Ok(folders) = Self::try_list_folders_inbox(session) {
            if !folders.is_empty() {
                if let Err(e) = session.logout() {
                    warn!("Logout failed after listing folders: {}", e);
                }
                return Ok(folders);
            }
        }
        
        // Try third approach
        if let Ok(folders) = Self::try_list_folders_none(session) {
            if let Err(e) = session.logout() {
                warn!("Logout failed after listing folders: {}", e);
            }
            return Ok(folders);
        }
        
        if let Err(e) = session.logout() {
            warn!("Logout failed after listing folders: {}", e);
        }
        
        Err(anyhow::anyhow!("Failed to list folders with any prefix combination"))
    }
    
    fn try_list_folders_empty<T>(session: &mut imap::Session<T>) -> Result<Vec<String>>
    where 
        T: std::io::Read + std::io::Write
    {
        let names = session.list(Some(""), Some("*"))?;
        let folders: Vec<String> = names
            .into_iter()
            .map(|name| name.name().to_string())
            .collect();
        debug!("Found {} folders with empty prefix", folders.len());
        Ok(folders)
    }
    
    fn try_list_folders_inbox<T>(session: &mut imap::Session<T>) -> Result<Vec<String>>
    where 
        T: std::io::Read + std::io::Write
    {
        warn!("Failed to list with empty prefix, trying INBOX prefix");
        let names = session.list(Some("INBOX"), Some("*"))?;
        let folders: Vec<String> = names
            .into_iter()
            .map(|name| name.name().to_string())
            .collect();
        debug!("Found {} folders with INBOX prefix", folders.len());
        Ok(folders)
    }
    
    fn try_list_folders_none<T>(session: &mut imap::Session<T>) -> Result<Vec<String>>
    where 
        T: std::io::Read + std::io::Write
    {
        warn!("Failed to list with INBOX prefix, trying without prefix");
        let names = session.list(None, Some("*"))?;
        let folders: Vec<String> = names
            .into_iter()
            .map(|name| name.name().to_string())
            .collect();
        debug!("Found {} folders with no prefix", folders.len());
        Ok(folders)
    }
    
    pub async fn fetch_emails_from_folder(&self, folder: &str, limit: Option<u32>) -> Result<Vec<Email>> {
        debug!("Fetching emails from folder '{}' with limit {:?} (TLS: {})", folder, limit, self.account.use_tls);
        
        let account = self.account.clone();
        let folder = folder.to_string();
        
        tokio::task::spawn_blocking(move || {
            let result = if account.use_tls {
                Self::fetch_emails_tls_sync(&account, &folder, limit)
            } else {
                Self::fetch_emails_plain_sync(&account, &folder, limit)
            };
            
            match &result {
                Ok(emails) => info!("fetch_emails_from_folder returned {} emails", emails.len()),
                Err(e) => error!("fetch_emails_from_folder failed: {}", e),
            }
            
            result
        })
        .await
        .unwrap()
    }
    
    fn fetch_emails_tls_sync(account: &ImapAccount, folder: &str, limit: Option<u32>) -> Result<Vec<Email>> {
        let mut session = Self::connect_tls_sync(account)?;
        
        // First, list available folders for debugging
        info!("Listing available folders for verification");
        match session.list(Some(""), Some("*")) {
            Ok(folders) => {
                let folder_names: Vec<String> = folders.iter().map(|f| f.name().to_string()).collect();
                info!("Available folders: {:?}", folder_names);
                
                // Check if our target folder exists (case-insensitive)
                let folder_exists = folder_names.iter().any(|f| f.eq_ignore_ascii_case(folder));
                if !folder_exists {
                    warn!("Target folder '{}' not found in available folders. Available: {:?}", folder, folder_names);
                    
                    // Try to find similar folders
                    let similar: Vec<String> = folder_names.iter()
                        .filter(|f| f.to_lowercase().contains(&folder.to_lowercase().replace("folders/", "")))
                        .cloned().collect();
                    if !similar.is_empty() {
                        info!("Found potentially similar folders: {:?}", similar);
                    }
                }
            },
            Err(e) => {
                warn!("Could not list folders: {}", e);
            }
        }
        
        // Select the folder
        info!("Attempting to select folder: '{}'", folder);
        let _mailbox = match session.select(folder) {
            Ok(mailbox) => {
                info!("Successfully selected folder '{}', {} messages found", folder, mailbox.exists);
                mailbox
            },
            Err(e) => {
                error!("Failed to select folder '{}': {}", folder, e);
                
                // Try alternative folder names for ProtonMail Bridge
                let alternatives = vec![
                    folder.replace("Folders/", ""),  // Remove "Folders/" prefix
                    folder.replace("Folders/", "").replace("/", "."), // Use dots instead of slashes
                    format!("INBOX.{}", folder.replace("Folders/", "").replace("/", ".")), // INBOX prefix
                    "INBOX".to_string(), // Fall back to INBOX
                ];
                
                for alt_folder in alternatives {
                    info!("Trying alternative folder name: '{}'", alt_folder);
                    match session.select(&alt_folder) {
                        Ok(mailbox) => {
                            warn!("Successfully selected alternative folder '{}' instead of '{}', {} messages found", alt_folder, folder, mailbox.exists);
                            return Self::fetch_from_selected_folder(session, &alt_folder, limit);
                        },
                        Err(e2) => {
                            debug!("Alternative folder '{}' also failed: {}", alt_folder, e2);
                        }
                    }
                }
                
                return Err(anyhow::anyhow!("Failed to select folder '{}' and all alternatives: {}", folder, e));
            }
        };
        
        Self::fetch_from_selected_folder(session, folder, limit)
    }
    
    fn fetch_emails_plain_sync(account: &ImapAccount, folder: &str, limit: Option<u32>) -> Result<Vec<Email>> {
        let session = Self::connect_plain_sync(account)?;
        
        Self::fetch_from_selected_folder(session, folder, limit)
    }
    
    
    fn fetch_from_selected_folder<T>(mut session: imap::Session<T>, folder: &str, limit: Option<u32>) -> Result<Vec<Email>>
    where
        T: std::io::Read + std::io::Write
    {
        let mailbox = session.examine(folder)?; // Use EXAMINE instead of SELECT for read-only access
        let total_messages = mailbox.exists;
        
        if total_messages == 0 {
            if let Err(e) = session.logout() {
                warn!("Logout failed (this is usually not critical): {}", e);
            }
            return Ok(vec![]);
        }
        
        // Use all messages or respect the provided limit
        let fetch_count = limit.unwrap_or(total_messages).min(total_messages);
        
        info!("Fetching messages: limit={:?}, total_messages={}", limit, total_messages);
        
        // Use ProtonMail Bridge compatible approach: get UIDs first, then fetch headers
        info!("Step 1: Getting UIDs using UID SEARCH ALL");
        let mut emails = Vec::new();
        
        // Get all UIDs first
        match session.uid_search("ALL") {
            Ok(uids) => {
                info!("Found {} UIDs total", uids.len());
                
                // Sort UIDs and take the last N (most recent messages)
                let mut sorted_uids: Vec<u32> = uids.into_iter().collect();
                sorted_uids.sort_unstable();
                
                let uids_to_fetch: Vec<u32> = sorted_uids
                    .into_iter()
                    .rev() // Get newest first (highest UIDs)
                    .take(fetch_count as usize)
                    .collect();
                
                if uids_to_fetch.is_empty() {
                    info!("No UIDs to fetch");
                } else {
                    info!("Fetching headers for {} UIDs: {:?}", uids_to_fetch.len(), uids_to_fetch);
                    
                    // Convert UIDs to comma-separated string
                    let uid_list = uids_to_fetch.iter().map(|u| u.to_string()).collect::<Vec<_>>().join(",");
                    
                    // Try UID FETCH with headers first
                    match session.uid_fetch(&uid_list, "BODY.PEEK[HEADER]") {
                        Ok(messages) => {
                            info!("BODY.PEEK[HEADER] fetch succeeded, processing {} messages", messages.len());
                            
                            // Store partial emails from headers
                            let mut partial_emails = Vec::new();
                            for message in messages.iter() {
                                match parse_email(message) {
                                    Ok(email) => {
                                        info!("Successfully parsed email headers: UID={}, from='{}', to='{}', subject='{}'", 
                                              email.uid, email.from, email.to, email.subject);
                                        partial_emails.push(email);
                                    }
                                    Err(e) => {
                                        warn!("Failed to parse email from BODY.PEEK[HEADER]: {}", e);
                                    }
                                }
                            }
                            
                            // Now try to fetch bodies separately
                            match session.uid_fetch(&uid_list, "BODY.PEEK[TEXT]") {
                                Ok(body_messages) => {
                                    info!("BODY.PEEK[TEXT] fetch succeeded, processing {} body messages", body_messages.len());
                                    
                                    // Match bodies to headers by UID
                                    for body_message in body_messages.iter() {
                                        if let Some(body_uid) = body_message.uid {
                                            if let Some(partial_email) = partial_emails.iter_mut().find(|e| e.uid == body_uid) {
                                                // Try body() first (for BODY.PEEK[TEXT]), then text() as fallback
                                                let body_data = body_message.body()
                                                    .or_else(|| body_message.text());
                                                    
                                                if let Some(data) = body_data {
                                                    partial_email.body = String::from_utf8_lossy(data).to_string();
                                                    info!("Added body content to email UID {}: {} chars", body_uid, partial_email.body.len());
                                                } else {
                                                    warn!("No body data found for UID {} despite successful fetch", body_uid);
                                                }
                                            }
                                        }
                                    }
                                },
                                Err(e) => {
                                    warn!("BODY.PEEK[TEXT] fetch failed: {}, using headers-only emails", e);
                                }
                            }
                            
                            emails.extend(partial_emails);
                        },
                        Err(e) => {
                            error!("BODY.PEEK[HEADER] fetch failed with specific error: {:?}", e);
                            warn!("BODY.PEEK[HEADER] fetch failed: {}, trying ENVELOPE", e);
                            // Try UID FETCH with ENVELOPE as fallback
                            match session.uid_fetch(&uid_list, "ENVELOPE") {
                                Ok(messages) => {
                                    info!("ENVELOPE fetch succeeded, processing {} messages", messages.len());
                                    for message in messages.iter() {
                                        match parse_email(message) {
                                            Ok(email) => {
                                                info!("Successfully parsed email from ENVELOPE: UID={}, from='{}', to='{}', subject='{}'", 
                                                      email.uid, email.from, email.to, email.subject);
                                                emails.push(email);
                                            }
                                            Err(e) => {
                                                warn!("Failed to parse email from ENVELOPE: {}", e);
                                            }
                                        }
                                    }
                                },
                                Err(e2) => {
                                    error!("ENVELOPE fetch failed with specific error: {:?}", e2);
                                    warn!("ENVELOPE fetch also failed: {}, falling back to basic UID fetch", e2);
                                    // Final fallback to basic UID fetch (just UIDs)
                                    match session.uid_fetch(&uid_list, "UID") {
                                        Ok(messages) => {
                                            warn!("Using UID-only fetch - emails will have minimal data");
                                            for message in messages.iter() {
                                                match parse_email(message) {
                                                    Ok(email) => {
                                                        info!("UID-only parsed email: UID={}, from='{}', to='{}', subject='{}'", 
                                                              email.uid, email.from, email.to, email.subject);
                                                        emails.push(email);
                                                    }
                                                    Err(e) => {
                                                        warn!("Failed to parse email from UID-only: {}", e);
                                                    }
                                                }
                                            }
                                        },
                                        Err(e3) => {
                                            error!("Even basic UID fetch failed: {:?}", e3);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            Err(search_err) => {
                error!("UID SEARCH ALL failed: {:?}", search_err);
                warn!("Could not get UIDs from server, falling back to sequence-based fetch");
                
                // Fallback to sequence-based fetch if UID SEARCH fails
                let start = if total_messages > fetch_count {
                    total_messages - fetch_count + 1
                } else {
                    1
                };
                let sequence_set = format!("{}:{}", start, total_messages);
                
                match session.fetch(&sequence_set, "UID") {
                    Ok(messages) => {
                        warn!("Using sequence-based UID-only fetch - emails will have minimal data");
                        for message in messages.iter() {
                            match parse_email(message) {
                                Ok(email) => {
                                    info!("Sequence-based UID-only email: UID={}, from='{}', to='{}', subject='{}'", 
                                          email.uid, email.from, email.to, email.subject);
                                    emails.push(email);
                                }
                                Err(e) => {
                                    warn!("Failed to parse email from sequence-based fetch: {}", e);
                                }
                            }
                        }
                    },
                    Err(e4) => {
                        error!("Even sequence-based fetch failed: {:?}", e4);
                    }
                }
            }
        }
        
        info!("Parsed {} emails from IMAP messages", emails.len());
        
        // Sort by date, newest first
        emails.sort_by(|a, b| b.date.cmp(&a.date));
        
        if let Err(e) = session.logout() {
            warn!("Logout failed (this is usually not critical): {}", e);
        }
        Ok(emails)
    }
    
    #[allow(dead_code)]
    pub async fn search_emails(&self, _folder: &str, _query: &str) -> Result<Vec<Email>> {
        // Search methods disabled for now - not currently used 
        warn!("Search functionality not yet implemented - returning empty results");
        Ok(vec![])
    }
    
    /// Mark an email as read by UID
    pub async fn mark_as_read(&self, uid: u32) -> Result<()> {
        info!("Marking email {} as read (placeholder implementation)", uid);
        // TODO: Implement actual mark as read functionality
        Ok(())
    }
    
    /// Delete an email by UID
    pub async fn delete_email(&self, uid: u32) -> Result<()> {
        info!("Deleting email {} (placeholder implementation)", uid);
        // TODO: Implement actual email deletion functionality
        Ok(())
    }
    
    /// Move an email to another folder by UID
    pub async fn move_to_folder(&self, uid: u32, target_folder: &str) -> Result<()> {
        info!("Moving email {} to folder '{}' (placeholder implementation)", uid, target_folder);
        // TODO: Implement actual email move functionality
        Ok(())
    }
}

/// Decode MIME-encoded headers (like =?utf-8?q?..?=)
fn decode_mime_header(encoded: &str) -> String {
    // Use RFC 2047 decoder to handle MIME encoded headers
    match rfc2047_decoder::decode(encoded.as_bytes()) {
        Ok(decoded) => decoded,
        Err(_) => {
            // If decoding fails, return the original string
            encoded.to_string()
        }
    }
}

fn parse_email(fetch: &imap::types::Fetch) -> Result<Email> {
    let uid = fetch.uid.ok_or_else(|| anyhow::anyhow!("Message has no UID"))?;
    
    let mut subject = String::new();
    let mut from = String::new();
    let mut to = String::new();
    let mut date = Utc::now();
    let mut message_id = String::new();
    let body;
    
    // Try parsing BODY[HEADER.FIELDS] first
    if let Some(body_data) = fetch.body() {
        let body_str = String::from_utf8_lossy(body_data);
        info!("Raw BODY data: {}", body_str.chars().take(200).collect::<String>());
        
        // Parse header fields from BODY response
        for line in body_str.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            
            if line.starts_with("Subject: ") {
                let raw_subject = line.strip_prefix("Subject: ").unwrap_or("");
                subject = decode_mime_header(raw_subject);
            } else if line.starts_with("From: ") {
                let raw_from = line.strip_prefix("From: ").unwrap_or("");
                from = decode_mime_header(raw_from);
            } else if line.starts_with("To: ") {
                let raw_to = line.strip_prefix("To: ").unwrap_or("");
                to = decode_mime_header(raw_to);
            } else if line.starts_with("Date: ") {
                let date_str = line.strip_prefix("Date: ").unwrap_or("");
                if let Ok(parsed_date) = DateTime::parse_from_rfc2822(date_str) {
                    date = parsed_date.with_timezone(&Utc);
                }
            } else if line.starts_with("Message-ID: ") || line.starts_with("Message-Id: ") {
                message_id = line.strip_prefix("Message-ID: ")
                    .or_else(|| line.strip_prefix("Message-Id: "))
                    .unwrap_or("").to_string();
                debug!("Found Message-ID: {}", message_id);
            }
        }
    } else if let Some(envelope) = fetch.envelope() {
        // Fall back to ENVELOPE (structured data)
        if let Some(subj) = &envelope.subject {
            let raw_subject = String::from_utf8_lossy(subj);
            subject = decode_mime_header(&raw_subject);
        }
        
        // Parse from addresses
        if let Some(from_addrs) = &envelope.from {
            if !from_addrs.is_empty() {
                let addr = &from_addrs[0];
                let name = addr.name.as_ref()
                    .map(|n| String::from_utf8_lossy(n).to_string())
                    .unwrap_or_default();
                let email = format!("{}@{}", 
                    addr.mailbox.as_ref().map(|m| String::from_utf8_lossy(m)).unwrap_or_default(),
                    addr.host.as_ref().map(|h| String::from_utf8_lossy(h)).unwrap_or_default()
                );
                from = if !name.is_empty() {
                    format!("{} <{}>", name, email)
                } else {
                    email
                };
            }
        }
        
        // Parse to addresses
        if let Some(to_addrs) = &envelope.to {
            if !to_addrs.is_empty() {
                let addr = &to_addrs[0];
                let email = format!("{}@{}", 
                    addr.mailbox.as_ref().map(|m| String::from_utf8_lossy(m)).unwrap_or_default(),
                    addr.host.as_ref().map(|h| String::from_utf8_lossy(h)).unwrap_or_default()
                );
                to = email;
            }
        }
        
        // Parse date
        if let Some(date_str) = &envelope.date {
            let date_string = String::from_utf8_lossy(date_str);
            if let Ok(parsed_date) = DateTime::parse_from_rfc2822(&date_string) {
                date = parsed_date.with_timezone(&Utc);
            }
        }
        
        // Parse message ID
        if let Some(msg_id) = &envelope.message_id {
            message_id = String::from_utf8_lossy(msg_id).to_string();
        }
    } else if let Some(header_data) = fetch.header() {
        // Fall back to parsing raw headers if neither BODY nor ENVELOPE is available
        let header_str = String::from_utf8_lossy(header_data);
        
        // Simple header parsing
        for line in header_str.lines() {
            if line.starts_with("Subject: ") {
                let raw_subject = line.strip_prefix("Subject: ").unwrap_or("");
                subject = decode_mime_header(raw_subject);
            } else if line.starts_with("From: ") {
                let raw_from = line.strip_prefix("From: ").unwrap_or("");
                from = decode_mime_header(raw_from);
            } else if line.starts_with("To: ") {
                let raw_to = line.strip_prefix("To: ").unwrap_or("");
                to = decode_mime_header(raw_to);
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
    let is_seen = fetch.flags().iter().any(|flag| matches!(flag, imap::types::Flag::Seen));
    
    // If we don't have basic email info, generate defaults
    if subject.is_empty() && from.is_empty() && message_id.is_empty() {
        subject = format!("[Email UID: {}]", uid);
        from = "[Unknown sender]".to_string();
        message_id = format!("<uid-{}>", uid);
    }
    
    debug!("Parsed email - UID: {}, Subject: '{}', From: '{}', To: '{}', MessageID: '{}'", 
           uid, subject, from, to, message_id);
    
    debug!("Parsed email: uid={}, message_id='{}', subject='{}'", uid, message_id, subject);
    
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