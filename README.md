# Mail2Feed

**Convert mailing lists into RSS/Atom feeds for your feed reader**

Mail2Feed monitors IMAP servers for emails to configurable addresses and converts them into RSS/Atom feeds that can be consumed by feed readers like Miniflux, Feedly, or any RSS-compatible application.

## 🚀 Features

- **Web Management Interface**: User-friendly GUI for configuring and managing feeds
- **IMAP Monitoring**: Connect to any IMAP server to monitor mailing lists
- **Flexible Filtering**: Filter emails by recipient, sender, subject, or labels
- **Multiple Feed Formats**: Generate both RSS and Atom feeds
- **Database Storage**: SQLite with planned PostgreSQL support
- **REST API**: Full REST API for programmatic access

## 🏗️ Architecture

### Backend (Rust)
- **Framework**: Axum web server with async support
- **Database**: SQLite via Diesel ORM with connection pooling
- **IMAP**: Native TLS-enabled IMAP client
- **Feed Generation**: RSS and Atom syndication support

### Frontend (TypeScript)
- **Framework**: React with Vite
- **UI**: Modern web interface with full CRUD operations
- **Styling**: Tailwind CSS for responsive design
- **Navigation**: React Router for seamless page transitions
- **State Management**: Context API for global state
- **API Integration**: REST client for backend communication

### Database Schema
```
imap_accounts → email_rules → feeds → feed_items
```

## 📋 Development Status

### ✅ Phase 1: Backend Foundation (Completed)
- [x] Database schema and migrations
- [x] Diesel ORM models and operations
- [x] Axum web server with REST API
- [x] Comprehensive test suite
- [x] Development tooling and scripts

### ✅ Phase 2: IMAP Processing (Completed)
- [x] IMAP client with TLS/non-TLS support
- [x] Email fetching and folder listing
- [x] Email filtering by sender, recipient, subject
- [x] Email parsing with header extraction
- [x] Processing engine that creates feed items from emails
- [x] API endpoints for testing and processing accounts

### ✅ Phase 3: Feed Generation (Completed)
- [x] RSS feed generation
- [x] Atom feed generation  
- [x] Feed serving endpoints with caching

### ✅ Phase 4: Frontend Interface (Completed)
- [x] React web application with Vite and TypeScript
- [x] IMAP account management (add, edit, delete, test connection)
- [x] Email rule management with filtering options
- [x] Feed configuration and management
- [x] Dashboard with system overview
- [x] Responsive design with Tailwind CSS
- [x] Error handling and toast notifications

### 📅 Phase 5: Integration & Testing (Planned)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Deployment documentation

## 🛠️ Quick Start

### Prerequisites

- **Rust** (1.70+): Install from [rustup.rs](https://rustup.rs/)
- **SQLite3**: For database storage
- **Node.js** (18+): For future frontend development

### Setup Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/matburt/mail2feed.git
   cd mail2feed
   ```

2. **Run the setup script**
   ```bash
   ./scripts/setup.sh
   ```
   
   This will:
   - Check required tools
   - Install Diesel CLI
   - Create configuration files
   - Set up the database
   - Install dependencies
   - Run tests

3. **Start the development server**
   ```bash
   ./scripts/dev.sh
   ```

4. **Access the Web Interface**
   Open your browser and navigate to:
   - Local: `http://localhost:3002`
   - Network: `http://0.0.0.0:3002` or `http://[your-ip]:3002`

### Using Mail2Feed

The web interface provides an intuitive way to manage your email-to-feed conversions:

1. **Add an IMAP Account**
   - Navigate to "Accounts" in the sidebar
   - Click "New Account"
   - Enter your email server details:
     
     **Common IMAP Server Settings:**
     - **Gmail**: `imap.gmail.com`, Port 993 (TLS), use app-specific password
     - **Outlook/Hotmail**: `outlook.office365.com`, Port 993 (TLS)
     - **Yahoo**: `imap.mail.yahoo.com`, Port 993 (TLS), use app password
     - **iCloud**: `imap.mail.me.com`, Port 993 (TLS), use app-specific password
     - **Protonmail Bridge**: `127.0.0.1` or your bridge IP, Port varies (usually no TLS), use bridge credentials
     
   - Test the connection before saving

2. **Create Email Rules**
   - Go to "Rules" and click "New Rule"
   - Select the IMAP account to monitor
   - Define filters (sender, recipient, subject keywords)
   - Choose which folder to monitor (INBOX, specific labels)

3. **Configure Feeds**
   - Navigate to "Feeds" and click "New Feed"
   - Select an email rule to convert to a feed
   - Choose RSS or Atom format
   - Customize the feed title and description

4. **Process Emails and View Feeds**
   - Use the "Process" button on accounts to fetch new emails
   - Access your feeds at:
     - RSS: `http://localhost:3001/feeds/{id}/rss`
     - Atom: `http://localhost:3001/feeds/{id}/atom`

### API Usage (Advanced)

For programmatic access or automation, Mail2Feed provides a REST API:

1. **Create an IMAP Account via API**
   ```bash
   curl -X POST http://localhost:3001/api/imap-accounts \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Gmail Account",
       "host": "imap.gmail.com",
       "port": 993,
       "username": "your-email@gmail.com",
       "password": "your-app-password",
       "use_tls": true
     }'
   ```

2. **Test the Connection**
   ```bash
   curl http://localhost:3001/api/imap/{account-id}/test
   ```
   
   This will return a list of available folders in your IMAP account.

3. **Create an Email Rule**
   ```bash
   curl -X POST http://localhost:3001/api/email-rules \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Mailing List Rule",
       "imap_account_id": "{account-id}",
       "folder": "INBOX",
       "from_address": "list@example.com",
       "subject_contains": "[LIST]",
       "is_active": true
     }'
   ```

4. **Create a Feed**
   ```bash
   curl -X POST http://localhost:3001/api/feeds \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Example Mailing List",
       "description": "RSS feed for the example mailing list",
       "link": "https://example.com/list",
       "email_rule_id": "{rule-id}",
       "feed_type": "rss",
       "is_active": true
     }'
   ```

5. **Process Emails**
   ```bash
   # Process a single account
   curl -X POST http://localhost:3001/api/imap/{account-id}/process
   
   # Process all accounts
   curl -X POST http://localhost:3001/api/imap/process-all
   ```

### Test the API

```bash
curl http://localhost:3001/health
```

### Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Backend setup
cd backend

# Install Diesel CLI
cargo install diesel_cli --no-default-features --features sqlite

# Create environment file
cp .env.example .env  # Edit as needed

# Setup database
mkdir -p ../data
export DATABASE_URL="sqlite:../data/mail2feed.db"
diesel migration run

# Install dependencies and build
cargo build

# Run tests
cargo test

# Start development server
cargo run
```

## 🧪 Testing

Run all tests:
```bash
./scripts/test.sh
```

Or run tests for specific components:
```bash
# Backend tests
cd backend
cargo test

# Frontend tests
cd frontend
npm test
```

### Test Coverage
- **Backend**: Database operations, API endpoints, IMAP processing, feed generation
- **Frontend**: Component tests, routing, API integration (85-90% coverage)
- **Integration**: Cascade deletes, error handling, validation

## 📚 API Documentation

### Health Check
```http
GET /health
```

### IMAP Accounts
```http
GET    /api/imap-accounts          # List all accounts
POST   /api/imap-accounts          # Create account
GET    /api/imap-accounts/{id}     # Get account by ID
PUT    /api/imap-accounts/{id}     # Update account
DELETE /api/imap-accounts/{id}     # Delete account
```

### Email Rules
```http
GET    /api/email-rules            # List all rules
POST   /api/email-rules            # Create rule
GET    /api/email-rules/{id}       # Get rule by ID
PUT    /api/email-rules/{id}       # Update rule
DELETE /api/email-rules/{id}       # Delete rule
```

### Feeds
```http
GET    /api/feeds                  # List all feeds
POST   /api/feeds                  # Create feed
GET    /api/feeds/{id}             # Get feed by ID
PUT    /api/feeds/{id}             # Update feed
DELETE /api/feeds/{id}             # Delete feed
GET    /api/feeds/{id}/items       # Get feed items
```

### IMAP Operations
```http
GET    /api/imap/{id}/test         # Test IMAP connection and list folders
POST   /api/imap/{id}/process      # Process emails for an account
POST   /api/imap/process-all       # Process all accounts
```

### Feed Output
```http
GET    /feeds/{id}/rss            # RSS feed
GET    /feeds/{id}/atom           # Atom feed
```

## 🔧 Configuration

Configuration is managed through environment variables in `backend/.env`:

```env
# Database
DATABASE_URL=sqlite:../data/mail2feed.db

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=3001

# Logging
RUST_LOG=info,mail2feed_backend=debug

# Feed Configuration (optional)
FEED_ITEM_LIMIT=50              # Maximum items per feed
FEED_CACHE_DURATION=300         # Cache duration in seconds
```

## 🗂️ Project Structure

```
mail2feed/
├── backend/                 # Rust backend application
│   ├── src/
│   │   ├── main.rs         # Application entry point
│   │   ├── api/            # REST API routes and handlers
│   │   ├── db/             # Database models, schema, operations
│   │   ├── imap/           # IMAP client and email processing
│   │   └── feed/           # Feed generation logic
│   ├── tests/              # Integration and unit tests
│   ├── migrations/         # Database migrations
│   └── Cargo.toml          # Rust dependencies
├── frontend/               # TypeScript frontend application
│   ├── src/
│   │   ├── api/            # API client and types
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components for routing
│   │   ├── context/        # Global state management
│   │   └── App.tsx         # Main application component
│   ├── package.json        # Frontend dependencies
│   └── vite.config.ts      # Vite configuration
├── scripts/                # Development and deployment scripts
│   ├── setup.sh           # Development environment setup
│   ├── dev.sh             # Start development server
│   ├── test.sh            # Run all tests
│   └── clean.sh           # Clean build artifacts
├── data/                   # Database files (created by setup)
├── CLAUDE.md               # AI assistant context and instructions
└── README.md               # This file
```

## 🛠️ Development Scripts

- **`./scripts/setup.sh`** - Complete development environment setup
- **`./scripts/dev.sh`** - Start both backend and frontend servers (0.0.0.0 for network access)
- **`./scripts/test.sh`** - Run all tests with proper configuration
- **`./scripts/clean.sh`** - Clean build artifacts and temporary files

### Network Access
Both servers bind to `0.0.0.0` by default, making them accessible from:
- Your local machine: `http://localhost:3002` (frontend), `http://localhost:3001` (backend)
- Other devices on your network: `http://[your-ip]:3002` (frontend), `http://[your-ip]:3001` (backend)

**Note**: The frontend uses Vite's proxy to forward API requests to the backend. This works automatically when both servers are on the same machine. If you're having issues with the proxy, you can:
1. Set `VITE_API_URL` in `frontend/.env` to the full backend URL
2. Or access the frontend from the same machine as the servers

## 📦 Releases

### Container Images

```bash
# Pull the latest images
docker pull ghcr.io/matburt/mail2feed/backend:latest
docker pull ghcr.io/matburt/mail2feed/frontend:latest
```

### Kubernetes Deployment

```bash
# Install via Helm from GitHub Container Registry
helm install mail2feed oci://ghcr.io/matburt/mail2feed/helm/mail2feed

# Install with external database
helm install mail2feed oci://ghcr.io/matburt/mail2feed/helm/mail2feed \
  --values k8s/mail2feed/values-external-db.yaml
```

### Creating Releases

```bash
# Create a new release (automated CI/CD)
./scripts/release.sh 1.0.0

# Build images locally
./scripts/build-images.sh -t v1.0.0 --push
```

See [RELEASE.md](RELEASE.md) for detailed release management documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`./scripts/test.sh`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: https://github.com/matburt/mail2feed
- **Issues**: https://github.com/matburt/mail2feed/issues
- **Discussions**: https://github.com/matburt/mail2feed/discussions

## 📞 Support

- Create an [issue](https://github.com/matburt/mail2feed/issues) for bug reports
- Start a [discussion](https://github.com/matburt/mail2feed/discussions) for questions
- Check existing documentation and API endpoints

---

**Made with ❤️ by the Mail2Feed community**