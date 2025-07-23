# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mail2feed** is a Rust backend and TypeScript frontend application that monitors IMAP servers for mailing lists and converts them into RSS/Atom feeds for consumption by feed readers like Miniflux.

### Key Features
- Monitors IMAP servers for emails to configurable addresses
- Supports filtering by tags or labels
- Converts each mailing list into its own feed
- Web GUI for managing email rules and feeds
- SQLite database (with future PostgreSQL support planned)

## Architecture

### Backend (Rust)
- **Framework**: Axum web server with async support
- **Database**: SQLite via Diesel ORM with r2d2 connection pooling
- **IMAP**: imap crate for email access (Phase 2)
- **Feed Generation**: rss and atom_syndication crates (Phase 3)
- **Key Components**:
  - ✅ REST API with CRUD endpoints
  - ✅ Database models and operations
  - ✅ Health check and error handling
  - ✅ IMAP connection manager
  - ✅ Email processor/filter
  - ✅ Feed generator

### Frontend (TypeScript)
- **Framework**: React with Vite and TypeScript
- **UI Components**: Full CRUD interface for accounts, rules, and feeds
- **Styling**: Tailwind CSS for responsive design
- **Routing**: React Router for navigation
- **State Management**: Context API for global state
- **Testing**: Jest and React Testing Library (85-90% coverage)
- **API Client**: Type-safe client for backend communication

### Database Schema (Implemented)
- **imap_accounts**: IMAP server configurations with credentials
- **email_rules**: Email filtering rules (linked to IMAP accounts)
- **feeds**: Generated feed configurations (linked to email rules)
- **feed_items**: Individual feed entries from emails (linked to feeds)
- **Relationships**: Full cascade delete support with foreign key constraints

## Development Commands

### Quick Start Scripts
```bash
./scripts/setup.sh   # Complete development environment setup
./scripts/dev.sh     # Start development server with hot reloading
./scripts/test.sh    # Run all tests with proper configuration
./scripts/clean.sh   # Clean build artifacts and temporary files
```

### Backend (Rust)
```bash
cd backend
cargo build          # Build the project
cargo run           # Run the development server
cargo test          # Run tests
cargo clippy        # Run linter
cargo fmt           # Format code
```

### Frontend (TypeScript)
```bash
cd frontend
npm install         # Install dependencies
npm run dev         # Start development server (http://localhost:3002)
npm run build       # Build for production
npm run lint        # Run ESLint
npm run test        # Run tests with coverage
npm run type-check  # Run TypeScript type checking
```

## Project Structure
```
mail2feed/
├── backend/                 # Rust backend application
│   ├── src/
│   │   ├── main.rs         # Application entry point
│   │   ├── lib.rs          # Library exports for testing
│   │   ├── api/            # ✅ REST API routes and handlers
│   │   │   ├── mod.rs      # Router setup and middleware
│   │   │   └── routes/     # Individual route handlers
│   │   ├── db/             # ✅ Database layer
│   │   │   ├── mod.rs      # Database connection and pool
│   │   │   ├── models.rs   # Diesel models and structs
│   │   │   ├── operations.rs # CRUD operations
│   │   │   └── schema.rs   # Diesel schema (auto-generated)
│   │   ├── imap/           # ✅ IMAP client and email processing
│   │   └── feed/           # ✅ Feed generation logic
│   ├── tests/              # ✅ Comprehensive test suite
│   │   ├── common/         # Test utilities and fixtures
│   │   ├── db_operations.rs # Database operation tests
│   │   └── api_endpoints.rs # API integration tests
│   ├── migrations/         # ✅ Database migrations
│   ├── .env               # ✅ Environment configuration
│   └── Cargo.toml         # ✅ Rust dependencies
├── frontend/               # ✅ TypeScript frontend application
│   ├── src/                # Frontend source code
│   │   ├── api/            # API client and types
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   └── context/        # State management
│   └── package.json        # Frontend dependencies
├── scripts/                # ✅ Development and deployment scripts
│   ├── setup.sh           # Complete development environment setup
│   ├── dev.sh             # Start development server
│   ├── test.sh            # Run all tests
│   └── clean.sh           # Clean build artifacts
├── data/                   # ✅ Database files (created by setup)
├── README.md               # ✅ Complete project documentation
└── CLAUDE.md               # This file
```

## Development Progress

### ✅ Phase 1: Backend Foundation (COMPLETED)
- **Database Schema**: Created tables for `imap_accounts`, `email_rules`, `feeds`, and `feed_items`
- **Diesel Models**: Type-safe Rust structs with proper serialization and Clone derives
- **Database Migrations**: Working migration system with SQLite support and foreign key constraints
- **Database Operations**: Complete CRUD operations for all models with proper error handling
- **Axum Web Server**: HTTP server with health check, CORS, and JSON middleware
- **REST API Endpoints**: Full CRUD operations for IMAP accounts, email rules, and feeds
- **Comprehensive Testing**: Database operation tests and API integration tests (10 tests total)
- **Development Tooling**: Setup scripts, development server, test runner, and clean scripts
- **Documentation**: Complete README with API documentation and getting started guide
- **Configuration**: Environment-based configuration with .env file support
- **Error Handling**: Proper HTTP status codes and JSON error responses

### ✅ Phase 2: IMAP Processing (COMPLETED)
- **GitHub Issue**: [#1 - Implement IMAP Processing](https://github.com/matburt/mail2feed/issues/1)
- ✅ IMAP client implementation and connection management
- ✅ Email fetching with filtering and processing
- ✅ Background monitoring service for new emails

### ✅ Phase 3: Feed Generation (COMPLETED)
- **GitHub Issue**: [#2 - Build Feed Generation Engine](https://github.com/matburt/mail2feed/issues/2)
- ✅ RSS feed generation from processed emails
- ✅ Atom feed generation with proper formatting
- ✅ Feed serving endpoints with caching

### ✅ Phase 4: Frontend Interface (COMPLETED)
- **GitHub Issue**: [#3 - Create Frontend Interface](https://github.com/matburt/mail2feed/issues/3)
- ✅ React web application with Vite build system
- ✅ Complete CRUD interfaces for accounts, rules, and feeds
- ✅ Form validation and error handling
- ✅ Responsive design with Tailwind CSS
- ✅ Dashboard with system overview
- ✅ Toast notifications for user feedback
- ✅ 85-90% test coverage

### 📅 Phase 5: Integration & Testing (PLANNED)
- **GitHub Issue**: [#4 - Integration and Testing](https://github.com/matburt/mail2feed/issues/4)
- End-to-end testing with real IMAP servers
- Performance optimization and monitoring
- Deployment documentation and Docker containers

## Implemented API Endpoints

### Health Check
- `GET /health` - Server health status with database connectivity

### IMAP Accounts
- `GET /api/imap-accounts` - List all IMAP accounts
- `POST /api/imap-accounts` - Create new IMAP account
- `GET /api/imap-accounts/{id}` - Get IMAP account by ID
- `PUT /api/imap-accounts/{id}` - Update IMAP account
- `DELETE /api/imap-accounts/{id}` - Delete IMAP account (cascades to rules/feeds)

### Email Rules  
- `GET /api/email-rules` - List all email rules
- `POST /api/email-rules` - Create new email rule
- `GET /api/email-rules/{id}` - Get email rule by ID
- `PUT /api/email-rules/{id}` - Update email rule
- `DELETE /api/email-rules/{id}` - Delete email rule (cascades to feeds)

### Feeds
- `GET /api/feeds` - List all feeds
- `POST /api/feeds` - Create new feed
- `GET /api/feeds/{id}` - Get feed by ID
- `PUT /api/feeds/{id}` - Update feed
- `DELETE /api/feeds/{id}` - Delete feed (cascades to items)
- `GET /api/feeds/{id}/items` - Get feed items
- `GET /feeds/{id}/rss` - RSS feed output
- `GET /feeds/{id}/atom` - Atom feed output

### IMAP Operations
- `GET /api/imap/{id}/test` - Test IMAP connection and list folders
- `POST /api/imap/{id}/process` - Process emails for an account
- `POST /api/imap/process-all` - Process all accounts

## Testing Strategy (Implemented)
- ✅ Database operation tests for all CRUD operations
- ✅ API integration tests for all endpoints
- ✅ Cascade delete testing with foreign key constraints
- ✅ Error handling and validation testing
- ✅ Unit tests for IMAP processing
- ✅ Unit tests for feed generation
- ✅ Frontend component tests with 85-90% coverage
- 🔄 End-to-end tests for critical user flows (Phase 5)

## Permissions

The Claude settings allow bash `ls` commands with any arguments. Check `.claude/settings.local.json` for current permissions.