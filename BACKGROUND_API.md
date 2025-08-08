# Background Processing API Endpoints

This document describes the REST API endpoints for controlling the background email processing service.

## Overview

The background service provides automated email processing capabilities that continuously monitor IMAP accounts and generate RSS/Atom feeds from new emails. The API allows manual control over the service and individual account processing.

## API Endpoints

### 1. Get Background Service Status

**GET** `/api/background/status`

Returns the current status of the background processing service.

**Response:**
```json
{
  "status": {
    "state": "Running",
    "started_at": 1703123456,
    "config": {
      "global_interval_minutes": 15,
      "per_account_interval_minutes": 30,
      "max_concurrent_accounts": 3,
      "enabled": true,
      "retry": {
        "max_attempts": 3,
        "initial_delay_seconds": 30,
        "max_delay_seconds": 300,
        "backoff_multiplier": 2.0
      },
      "limits": {
        "max_emails_per_run": 100,
        "max_processing_time_seconds": 300,
        "max_email_age_days": 7
      }
    },
    "accounts_count": 5,
    "active_processing_count": 2,
    "total_emails_processed": 1250,
    "total_errors": 3,
    "uptime_seconds": 86400
  }
}
```

**Status States:**
- `Stopped` - Service is not running
- `Starting` - Service is starting up
- `Running` - Service is active and processing
- `Stopping` - Service is shutting down
- `Error(message)` - Service encountered an error

### 2. Start Background Service

**POST** `/api/background/start`

Starts the background processing service.

**Request Body:**
```json
{
  "force": false  // Optional: force start even if already running
}
```

**Response:**
```json
{
  "success": true,
  "message": "Background service started successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Service is already running"
}
```

### 3. Stop Background Service

**POST** `/api/background/stop`

Stops the background processing service gracefully.

**Response:**
```json
{
  "success": true,
  "message": "Background service stopped successfully"
}
```

### 4. Restart Background Service

**POST** `/api/background/restart`

Restarts the background processing service (stop + start).

**Response:**
```json
{
  "success": true,
  "message": "Background service restarted successfully"
}
```

### 5. Process Specific Account

**POST** `/api/background/process/{account_id}`

Manually triggers processing for a specific IMAP account.

**Parameters:**
- `account_id` (path) - The UUID of the IMAP account to process

**Response:**
```json
{
  "account_id": "12345678-1234-1234-1234-123456789abc",
  "success": true,
  "message": "Account processed successfully"
}
```

**Error Response:**
```json
{
  "account_id": "12345678-1234-1234-1234-123456789abc",
  "success": false,
  "message": "Failed to process account: Connection timeout"
}
```

### 6. Process All Accounts

**POST** `/api/background/process-all`

Manually triggers processing for all configured IMAP accounts.

**Response:**
```json
[
  {
    "account_id": "12345678-1234-1234-1234-123456789abc",
    "success": true,
    "message": "Account Gmail processed successfully"
  },
  {
    "account_id": "87654321-4321-4321-4321-cba987654321",
    "success": false,
    "message": "Failed to process account Outlook: Authentication failed"
  }
]
```

## Error Codes

### HTTP Status Codes

- `200 OK` - Request succeeded
- `404 Not Found` - Account not found
- `500 Internal Server Error` - Server error occurred
- `503 Service Unavailable` - Background service not initialized

### Common Error Messages

- `"Account {id} not found"` - The specified account ID doesn't exist
- `"Background service not initialized"` - The service hasn't been properly started
- `"Service is already running"` - Attempted to start when already active
- `"Failed to start service: {reason}"` - Service startup failed
- `"Database connection failed"` - Could not connect to database

## Configuration

The background service can be configured via environment variables:

```bash
# Processing intervals
BACKGROUND_GLOBAL_INTERVAL_MINUTES=15      # Check all accounts every 15 minutes
BACKGROUND_PER_ACCOUNT_INTERVAL_MINUTES=30 # Process same account max once per 30 minutes

# Concurrency
BACKGROUND_MAX_CONCURRENT_ACCOUNTS=3       # Process up to 3 accounts simultaneously

# Service control
BACKGROUND_PROCESSING_ENABLED=true         # Enable/disable background processing

# Retry settings
BACKGROUND_RETRY_MAX_ATTEMPTS=3
BACKGROUND_RETRY_INITIAL_DELAY_SECONDS=30

# Processing limits
BACKGROUND_MAX_EMAILS_PER_RUN=100
BACKGROUND_MAX_PROCESSING_TIME_SECONDS=300
BACKGROUND_MAX_EMAIL_AGE_DAYS=7
```

## Implementation Details

### Service Architecture

1. **EmailScheduler** - Core scheduling engine that manages processing intervals and concurrency
2. **BackgroundService** - Main service wrapper that provides start/stop/status functionality
3. **EmailProcessor** - Handles individual account processing and email conversion to feed items

### Concurrency & Safety

- Maximum concurrent account processing is configurable (default: 3)
- Semaphore-based concurrency control prevents resource exhaustion
- Proper async task spawning with lifetime management
- Graceful shutdown with cancellation tokens

### Error Handling & Retry Logic

- Exponential backoff for failed processing attempts
- Configurable retry limits and delays
- Comprehensive error logging and reporting
- Account-level error isolation (one failing account doesn't affect others)

### Monitoring & Observability

- Detailed processing statistics per account
- Service uptime and health monitoring
- Comprehensive logging with tracing integration
- API endpoints for runtime status inspection