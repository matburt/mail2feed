//! CRLF Stream Wrapper for ProtonMail Bridge compatibility
//! 
//! ProtonMail Bridge requires strict IMAP protocol compliance with CRLF line endings.
//! This module provides a stream wrapper that ensures all outgoing data has proper \r\n endings.

use futures::{AsyncRead, AsyncWrite};
use std::pin::Pin;
use std::task::{Context, Poll};
use tracing::{debug, trace};

/// A wrapper that can optionally ensure all outgoing data has proper CRLF line endings
pub struct CrlfStreamWrapper<T> {
    inner: T,
    #[allow(dead_code)]
    write_buffer: Vec<u8>,
    enable_crlf_processing: bool,
}

impl<T> CrlfStreamWrapper<T> {
    /// Create a new wrapper with CRLF processing enabled (for ProtonMail Bridge)
    #[allow(dead_code)]
    pub fn new(inner: T) -> Self {
        Self {
            inner,
            write_buffer: Vec::new(),
            enable_crlf_processing: true,
        }
    }
    
    /// Create a new wrapper with CRLF processing disabled (passthrough mode)
    #[allow(dead_code)]
    pub fn new_passthrough(inner: T) -> Self {
        Self {
            inner,
            write_buffer: Vec::new(),
            enable_crlf_processing: false,
        }
    }
    
    /// Process outgoing data to ensure CRLF line endings (if enabled)
    fn process_outgoing_data(&self, data: &[u8]) -> Vec<u8> {
        if !self.enable_crlf_processing {
            // Passthrough mode - return data as-is
            return data.to_vec();
        }
        
        let mut result = Vec::with_capacity(data.len() + 10); // Extra space for potential CRLF additions
        let mut i = 0;
        
        while i < data.len() {
            let byte = data[i];
            
            if byte == b'\n' {
                // Check if it's already preceded by \r
                if i == 0 || data[i - 1] != b'\r' {
                    // Add missing \r before \n
                    result.push(b'\r');
                    trace!("Added missing CR before LF at position {}", i);
                }
            }
            
            result.push(byte);
            i += 1;
        }
        
        debug!("Processed {} bytes -> {} bytes for CRLF compliance", data.len(), result.len());
        result
    }
}

impl<T> AsyncRead for CrlfStreamWrapper<T>
where
    T: AsyncRead + Unpin,
{
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut [u8],
    ) -> Poll<std::io::Result<usize>> {
        // For reading, we don't need to process data - just pass through
        Pin::new(&mut self.inner).poll_read(cx, buf)
    }
}


impl<T> AsyncWrite for CrlfStreamWrapper<T>
where
    T: AsyncWrite + Unpin,
{
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<Result<usize, std::io::Error>> {
        // Log what's being written
        if self.enable_crlf_processing {
            let buf_str = String::from_utf8_lossy(buf);
            debug!("CRLF wrapper processing outgoing data: {:?}", buf_str);
        }
        
        // Process the data to ensure CRLF line endings
        let processed_data = self.process_outgoing_data(buf);
        
        // Write the processed data
        match Pin::new(&mut self.inner).poll_write(cx, &processed_data) {
            Poll::Ready(Ok(_written)) => {
                // Return the original buffer size, not the processed size
                // This ensures the caller thinks all their data was written
                Poll::Ready(Ok(buf.len()))
            }
            Poll::Ready(Err(e)) => Poll::Ready(Err(e)),
            Poll::Pending => Poll::Pending,
        }
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Result<(), std::io::Error>> {
        Pin::new(&mut self.inner).poll_flush(cx)
    }

    fn poll_close(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Result<(), std::io::Error>> {
        Pin::new(&mut self.inner).poll_close(cx)
    }
}


// Implement required traits for async-imap compatibility
impl<T> std::fmt::Debug for CrlfStreamWrapper<T>
where
    T: std::fmt::Debug,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CrlfStreamWrapper")
            .field("inner", &self.inner)
            .field("enable_crlf_processing", &self.enable_crlf_processing)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_crlf_processing() {
        let wrapper: CrlfStreamWrapper<Vec<u8>> = CrlfStreamWrapper::new(vec![]);
        
        // Test: LF without CR should get CR added
        let input = b"FETCH 1 FLAGS\n";
        let expected = b"FETCH 1 FLAGS\r\n";
        let result = wrapper.process_outgoing_data(input);
        assert_eq!(result, expected);
        
        // Test: Already proper CRLF should be unchanged
        let input = b"FETCH 1 FLAGS\r\n";
        let expected = b"FETCH 1 FLAGS\r\n";
        let result = wrapper.process_outgoing_data(input);
        assert_eq!(result, expected);
        
        // Test: Multiple lines
        let input = b"A001 FETCH 1 FLAGS\nA002 NOOP\n";
        let expected = b"A001 FETCH 1 FLAGS\r\nA002 NOOP\r\n";
        let result = wrapper.process_outgoing_data(input);
        assert_eq!(result, expected);
    }
}