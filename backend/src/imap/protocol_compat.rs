// Protocol compatibility module - currently unused as we've moved to synchronous imap
// Keeping this file for potential future use or reference

#[allow(dead_code)]
pub struct ProtocolCompat;

/*
/// Protocol compatibility wrapper for ProtonMail Bridge
/// 
/// ProtonMail Bridge has strict IMAP protocol requirements and expects
/// proper CRLF line endings. This module provides compatibility helpers.
pub struct ProtocolCompat;

impl ProtocolCompat {
    /// Check if we're connecting to ProtonMail Bridge
    /// This is a heuristic-based approach since ProtonMail Bridge doesn't expose unique identifiers
    pub fn is_protonmail_bridge(host: &str, port: u16) -> bool {
        // ProtonMail Bridge characteristics:
        // 1. Runs locally (localhost, 127.0.0.1, or local network)
        // 2. Often uses non-standard ports (to avoid conflicts)
        // 3. May run on standard ports but locally
        
        let is_local_host = host == "localhost" || 
                           host == "127.0.0.1" || 
                           host.starts_with("10.") || 
                           host.starts_with("192.168.") ||
                           host.starts_with("172.16.") ||  // Add other RFC1918 ranges
                           host.starts_with("172.17.") ||
                           host.starts_with("172.18.") ||
                           host.starts_with("172.19.") ||
                           host.starts_with("172.20.") ||
                           host.starts_with("172.21.") ||
                           host.starts_with("172.22.") ||
                           host.starts_with("172.23.") ||
                           host.starts_with("172.24.") ||
                           host.starts_with("172.25.") ||
                           host.starts_with("172.26.") ||
                           host.starts_with("172.27.") ||
                           host.starts_with("172.28.") ||
                           host.starts_with("172.29.") ||
                           host.starts_with("172.30.") ||
                           host.starts_with("172.31.");
        
        // ProtonMail Bridge typically uses non-standard ports like 1143, 1025 etc
        // Standard IMAP ports (143, 993) on localhost are likely other services
        let is_non_standard_port = port != 143 && port != 993;
        
        // Only treat as ProtonMail Bridge if it's local AND on a non-standard port
        is_local_host && is_non_standard_port
    }
    
    /// Detect if the connected server is actually ProtonMail Bridge at runtime
    /// This provides better detection than host/port heuristics
    pub async fn detect_protonmail_bridge<T>(session: &mut Session<crate::imap::crlf_wrapper::CrlfStreamWrapper<T>>) -> bool
    where 
        T: AsyncRead + AsyncWrite + Unpin + Send + std::fmt::Debug
    {
        // Method 1: Check server capabilities for ProtonMail-specific patterns
        if let Ok(caps) = session.capabilities().await {
            let cap_list: Vec<String> = caps.iter()
                .map(|c| format!("{:?}", c))
                .collect();
            
            // ProtonMail Bridge has a specific set of capabilities
            // Look for the exact combination that suggests ProtonMail Bridge
            let has_move = cap_list.iter().any(|c| c.contains("MOVE"));
            let has_idle = cap_list.iter().any(|c| c.contains("IDLE"));
            let has_id = cap_list.iter().any(|c| c.contains("ID"));
            let has_unselect = cap_list.iter().any(|c| c.contains("UNSELECT"));
            let has_uidplus = cap_list.iter().any(|c| c.contains("UIDPLUS"));
            
            // This exact combination is common for ProtonMail Bridge
            if has_move && has_idle && has_id && has_unselect && has_uidplus {
                debug!("Server capability pattern matches ProtonMail Bridge");
                
                // Method 2: Try to get server ID (if supported)
                // Note: ID extension requires special handling that might not be in async-imap
                // For now, rely on the capability pattern + behavioral detection
                
                return true;
            }
        }
        
        // Method 3: Behavioral detection - try a simple FETCH and see if it fails with CRLF error
        // This is done implicitly by the calling code when it encounters "expected CR" errors
        
        false
    }

    /// Get debugging information about the IMAP server
    pub async fn debug_server_info<T>(session: &mut Session<crate::imap::crlf_wrapper::CrlfStreamWrapper<T>>) -> Result<()>
    where 
        T: AsyncRead + AsyncWrite + Unpin + Send + std::fmt::Debug
    {
        info!("Gathering IMAP server information for debugging");
        
        // Try to get CAPABILITY information
        match session.capabilities().await {
            Ok(caps) => {
                let cap_list: Vec<String> = caps.iter()
                    .map(|c| format!("{:?}", c))
                    .collect();
                info!("Server capabilities: {:?}", cap_list);
                
                // Check for specific capabilities that might affect fetch
                if cap_list.iter().any(|c| c.contains("IDLE")) {
                    debug!("Server supports IDLE extension");
                }
                if cap_list.iter().any(|c| c.contains("COMPRESS")) {
                    debug!("Server supports COMPRESS extension");
                }
                if cap_list.iter().any(|c| c.contains("QRESYNC")) {
                    debug!("Server supports QRESYNC extension");
                }
            }
            Err(e) => {
                warn!("Failed to get server capabilities: {}", e);
            }
        }
        
        // Try NOOP to test basic protocol compliance
        match session.noop().await {
            Ok(_) => {
                debug!("NOOP command successful - basic protocol compliance confirmed");
            }
            Err(e) => {
                warn!("NOOP command failed: {}", e);
            }
        }
        
        Ok(())
    }
    
    /// Alternative fetch approach for ProtonMail Bridge
    /// Uses simpler, more compatible FETCH commands
    pub async fn protonmail_compatible_fetch<T>(
        session: &mut Session<crate::imap::crlf_wrapper::CrlfStreamWrapper<T>>,
        sequence_set: &str,
    ) -> Result<Vec<async_imap::types::Fetch>>
    where 
        T: AsyncRead + AsyncWrite + Unpin + Send + std::fmt::Debug
    {
        use futures::StreamExt;
        
        info!("Using ProtonMail Bridge compatible fetch for sequence: {}", sequence_set);
        
        // Strategy 1: Try ENVELOPE with UID (minimal data)
        debug!("Trying ENVELOPE with UID fetch");
        match session.fetch(sequence_set, "ENVELOPE UID").await {
            Ok(mut stream) => {
                info!("ENVELOPE fetch command succeeded, starting manual stream collection...");
                let mut messages: Vec<async_imap::types::Fetch> = Vec::new();
                let timeout_duration = std::time::Duration::from_secs(5);
                
                // Manually collect with timeout per item to avoid hanging
                loop {
                    match tokio::time::timeout(timeout_duration, stream.next()).await {
                        Ok(Some(Ok(message))) => {
                            messages.push(message);
                            info!("Collected ENVELOPE message {}", messages.len());
                        }
                        Ok(Some(Err(e))) => {
                            warn!("Error in ENVELOPE stream item: {}", e);
                            break;
                        }
                        Ok(None) => {
                            info!("ENVELOPE stream ended normally, collected {} messages", messages.len());
                            break;
                        }
                        Err(_) => {
                            warn!("ENVELOPE stream item timed out after 5 seconds, collected {} messages so far", messages.len());
                            break;
                        }
                    }
                }
                
                if !messages.is_empty() {
                    info!("Successfully fetched {} messages with ENVELOPE", messages.len());
                    return Ok(messages);
                } else {
                    warn!("ENVELOPE fetch returned empty results");
                }
            }
            Err(e) => {
                warn!("ENVELOPE fetch command failed: {}", e);
            }
        }
        
        // Strategy 2: Try INTERNALDATE only
        debug!("Trying INTERNALDATE-only fetch");
        match session.fetch(sequence_set, "INTERNALDATE").await {
            Ok(stream) => {
                let timeout_duration = std::time::Duration::from_secs(30);
                match tokio::time::timeout(timeout_duration, stream.collect::<Vec<_>>()).await {
                    Ok(results) => {
                        let messages: Vec<_> = results.into_iter().filter_map(|r| r.ok()).collect();
                        if !messages.is_empty() {
                            info!("Successfully fetched {} messages with INTERNALDATE", messages.len());
                            return Ok(messages);
                        }
                    }
                    Err(_) => {
                        warn!("INTERNALDATE fetch timed out after 30 seconds");
                    }
                }
            }
            Err(e) => {
                warn!("INTERNALDATE fetch failed: {}", e);
            }
        }
        
        // Strategy 3: Try UID only (absolute minimum)
        debug!("Trying UID-only fetch");
        match session.fetch(sequence_set, "UID").await {
            Ok(stream) => {
                let timeout_duration = std::time::Duration::from_secs(30);
                match tokio::time::timeout(timeout_duration, stream.collect::<Vec<_>>()).await {
                    Ok(results) => {
                        let messages: Vec<_> = results.into_iter().filter_map(|r| r.ok()).collect();
                        if !messages.is_empty() {
                            info!("Successfully fetched {} messages with UID only", messages.len());
                            return Ok(messages);
                        }
                    }
                    Err(_) => {
                        warn!("UID-only fetch timed out after 30 seconds");
                    }
                }
            }
            Err(e) => {
                warn!("UID-only fetch failed: {}", e);
            }
        }
        
        // If all strategies fail, return error with detailed explanation
        Err(anyhow::anyhow!(
            "ProtonMail Bridge FETCH compatibility issue: The server reports 'Unable to parse status response' \
            for all FETCH commands. This indicates a protocol-level incompatibility where the server \
            expects different command formatting (likely CRLF line endings) than what async-imap provides. \
            This is a known issue with ProtonMail Bridge's strict IMAP implementation."
        ))
    }
}

*/

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_protocol_compat_exists() {
        // Just verify the struct exists
        let _compat = ProtocolCompat;
    }
}