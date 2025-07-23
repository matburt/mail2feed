use anyhow::{Result, Context};
use imap::{Session, types::Fetch};
use native_tls::{TlsConnector, TlsStream};
use std::net::TcpStream;
use std::time::Duration;
use crate::db::models::ImapAccount;
use chrono::{DateTime, Utc};
use tracing::{debug, warn, error};

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
            let mut session = self.connect_tls()
                .context("Failed to establish TLS connection")?;
            
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
            let mut session = self.connect_plain()
                .context("Failed to establish plain connection")?;
                
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
    }

    fn connect_tls(&self) -> Result<Session<TlsStream<TcpStream>>> {
        debug!("Creating TLS connection to {}:{}", self.account.host, self.account.port);
        
        let tls = TlsConnector::builder()
            .danger_accept_invalid_certs(false)
            .build()
            .context("Failed to create TLS connector")?;
            
        let client = imap::connect(
            (self.account.host.as_str(), self.account.port as u16),
            &self.account.host,
            &tls,
        ).map_err(|e| {
            error!("TLS connection failed: {}", e);
            anyhow::anyhow!("Failed to connect to IMAP server with TLS: {}. Check host, port, and TLS settings.", e)
        })?;
        
        debug!("TLS connection established, attempting login");
        
        let session = client
            .login(&self.account.username, &self.account.password)
            .map_err(|e| {
                error!("Login failed: {:?}", e.0);
                anyhow::anyhow!("Failed to login: {}. Check username and password. If using Gmail, ensure you're using an app-specific password.", e.0)
            })?;
            
        debug!("Login successful");
        Ok(session)
    }

    fn connect_plain(&self) -> Result<Session<TcpStream>> {
        debug!("Creating plain connection to {}:{}", self.account.host, self.account.port);
        
        let stream = TcpStream::connect((self.account.host.as_str(), self.account.port as u16))
            .map_err(|e| {
                error!("TCP connection failed: {}", e);
                anyhow::anyhow!("Failed to connect to IMAP server: {}. Check host and port. Common ports: 143 (plain), 993 (TLS).", e)
            })?;
            
        // Set timeout to avoid hanging on bad connections
        stream.set_read_timeout(Some(Duration::from_secs(30)))
            .context("Failed to set read timeout")?;
        stream.set_write_timeout(Some(Duration::from_secs(30)))
            .context("Failed to set write timeout")?;
            
        let client = imap::Client::new(stream);
        
        debug!("Plain connection established, attempting login");
        
        let session = client
            .login(&self.account.username, &self.account.password)
            .map_err(|e| {
                error!("Login failed: {:?}", e.0);
                anyhow::anyhow!("Failed to login: {}. Check username and password.", e.0)
            })?;
            
        debug!("Login successful");
        Ok(session)
    }
    
    pub fn list_folders(&self) -> Result<Vec<String>> {
        debug!("Listing folders for account: {}", self.account.name);
        
        let folders = if self.account.use_tls {
            let mut session = self.connect_tls()?;
            
            // Try different folder listing approaches
            let names = match session.list(Some(""), Some("*")) {
                Ok(names) => names,
                Err(e) => {
                    warn!("Failed to list with empty prefix, trying INBOX prefix: {}", e);
                    // Some servers require specific prefixes
                    match session.list(Some("INBOX"), Some("*")) {
                        Ok(names) => names,
                        Err(e) => {
                            warn!("Failed to list with INBOX prefix, trying without prefix: {}", e);
                            session.list(None, Some("*"))
                                .context("Failed to list folders with any prefix combination")?
                        }
                    }
                }
            };
            
            let folders: Vec<String> = names
                .iter()
                .map(|n| n.name().to_string())
                .collect();
                
            debug!("Found {} folders", folders.len());
            if let Err(e) = session.logout() {
                warn!("Logout failed after listing folders: {}", e);
            }
            folders
        } else {
            let mut session = self.connect_plain()?;
            
            // Try different folder listing approaches
            let names = match session.list(Some(""), Some("*")) {
                Ok(names) => names,
                Err(e) => {
                    warn!("Failed to list with empty prefix, trying INBOX prefix: {}", e);
                    // Some servers require specific prefixes
                    match session.list(Some("INBOX"), Some("*")) {
                        Ok(names) => names,
                        Err(e) => {
                            warn!("Failed to list with INBOX prefix, trying without prefix: {}", e);
                            session.list(None, Some("*"))
                                .context("Failed to list folders with any prefix combination")?
                        }
                    }
                }
            };
            
            let folders: Vec<String> = names
                .iter()
                .map(|n| n.name().to_string())
                .collect();
                
            debug!("Found {} folders", folders.len());
            if let Err(e) = session.logout() {
                warn!("Logout failed after listing folders: {}", e);
            }
            folders
        };
        
        if folders.is_empty() {
            warn!("No folders found - this might indicate a configuration issue");
        }
        
        Ok(folders)
    }
    
    pub fn fetch_emails_from_folder(&self, folder: &str, limit: Option<u32>) -> Result<Vec<Email>> {
        if self.account.use_tls {
            self.fetch_emails_tls(folder, limit)
        } else {
            self.fetch_emails_plain(folder, limit)
        }
    }
    
    fn fetch_emails_tls(&self, folder: &str, limit: Option<u32>) -> Result<Vec<Email>> {
        let mut session = self.connect_tls()?;
        
        // Select the folder
        let mailbox = session.select(folder)?;
        let total_messages = mailbox.exists;
        
        if total_messages == 0 {
            session.logout()?;
            return Ok(vec![]);
        }
        
        // Calculate the range to fetch
        let fetch_count = limit.unwrap_or(50).min(total_messages);
        let start = if total_messages > fetch_count {
            total_messages - fetch_count + 1
        } else {
            1
        };
        
        let sequence_set = format!("{}:{}", start, total_messages);
        
        // Fetch messages with headers and flags
        let messages = session.fetch(&sequence_set, "RFC822.HEADER RFC822.TEXT FLAGS UID")?;
        
        let mut emails = Vec::new();
        
        for message in messages.iter() {
            if let Ok(email) = parse_email(message) {
                emails.push(email);
            }
        }
        
        // Sort by date, newest first
        emails.sort_by(|a, b| b.date.cmp(&a.date));
        
        session.logout()?;
        Ok(emails)
    }
    
    fn fetch_emails_plain(&self, folder: &str, limit: Option<u32>) -> Result<Vec<Email>> {
        let mut session = self.connect_plain()?;
        
        // Select the folder
        let mailbox = session.select(folder)?;
        let total_messages = mailbox.exists;
        
        if total_messages == 0 {
            session.logout()?;
            return Ok(vec![]);
        }
        
        // Calculate the range to fetch
        let fetch_count = limit.unwrap_or(50).min(total_messages);
        let start = if total_messages > fetch_count {
            total_messages - fetch_count + 1
        } else {
            1
        };
        
        let sequence_set = format!("{}:{}", start, total_messages);
        
        // Fetch messages with headers and flags
        let messages = session.fetch(&sequence_set, "RFC822.HEADER RFC822.TEXT FLAGS UID")?;
        
        let mut emails = Vec::new();
        
        for message in messages.iter() {
            if let Ok(email) = parse_email(message) {
                emails.push(email);
            }
        }
        
        // Sort by date, newest first
        emails.sort_by(|a, b| b.date.cmp(&a.date));
        
        session.logout()?;
        Ok(emails)
    }
    
    #[allow(dead_code)]
    pub fn search_emails(&self, folder: &str, query: &str) -> Result<Vec<Email>> {
        if self.account.use_tls {
            self.search_emails_tls(folder, query)
        } else {
            self.search_emails_plain(folder, query)
        }
    }
    
    #[allow(dead_code)]
    fn search_emails_tls(&self, folder: &str, query: &str) -> Result<Vec<Email>> {
        let mut session = self.connect_tls()?;
        
        // Select the folder
        session.select(folder)?;
        
        // Search for messages
        let uids = session.search(query)?;
        
        if uids.is_empty() {
            session.logout()?;
            return Ok(vec![]);
        }
        
        // Convert UIDs to sequence set
        let uid_strings: Vec<String> = uids.iter().map(|&uid| uid.to_string()).collect();
        let sequence_set = uid_strings.join(",");
        
        // Fetch messages by UID
        let messages = session.fetch(&sequence_set, "RFC822.HEADER RFC822.TEXT FLAGS UID")?;
        
        let mut emails = Vec::new();
        
        for message in messages.iter() {
            if let Ok(email) = parse_email(message) {
                emails.push(email);
            }
        }
        
        session.logout()?;
        Ok(emails)
    }
    
    #[allow(dead_code)]
    fn search_emails_plain(&self, folder: &str, query: &str) -> Result<Vec<Email>> {
        let mut session = self.connect_plain()?;
        
        // Select the folder
        session.select(folder)?;
        
        // Search for messages
        let uids = session.search(query)?;
        
        if uids.is_empty() {
            session.logout()?;
            return Ok(vec![]);
        }
        
        // Convert UIDs to sequence set
        let uid_strings: Vec<String> = uids.iter().map(|&uid| uid.to_string()).collect();
        let sequence_set = uid_strings.join(",");
        
        // Fetch messages by UID
        let messages = session.fetch(&sequence_set, "RFC822.HEADER RFC822.TEXT FLAGS UID")?;
        
        let mut emails = Vec::new();
        
        for message in messages.iter() {
            if let Ok(email) = parse_email(message) {
                emails.push(email);
            }
        }
        
        session.logout()?;
        Ok(emails)
    }
}

fn parse_email(fetch: &Fetch) -> Result<Email> {
    let uid = fetch.uid.ok_or_else(|| anyhow::anyhow!("Message has no UID"))?;
    
    // Parse headers
    let header_data = fetch.header()
        .ok_or_else(|| anyhow::anyhow!("No header data"))?;
    let header_str = String::from_utf8_lossy(header_data);
    
    let mut subject = String::new();
    let mut from = String::new();
    let mut to = String::new();
    let mut date = Utc::now();
    let mut message_id = String::new();
    
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
    
    // Parse body
    let body_data = fetch.text()
        .ok_or_else(|| anyhow::anyhow!("No body data"))?;
    let body = String::from_utf8_lossy(body_data).to_string();
    
    // Check if email is seen
    let is_seen = fetch.flags().contains(&imap::types::Flag::Seen);
    
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