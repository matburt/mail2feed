# Mail2Feed Kubernetes Deployment

This directory contains Helm charts and deployment scripts for running mail2feed in Kubernetes.

## Prerequisites

- Kubernetes cluster (local or remote)
- Helm 3.x installed
- kubectl configured to access your cluster
- Docker images built and available in your registry

## Quick Start

### 1. Test the Deployment

```bash
# Validate Helm templates and Kubernetes manifests
./scripts/k8s-test.sh
```

### 2. Deploy to Development

```bash
# Deploy to development environment
./scripts/k8s-deploy.sh -e dev
```

### 3. Access the Application

```bash
# Port forward to access the frontend
kubectl port-forward --namespace mail2feed-dev svc/mail2feed-dev-frontend 3002:3002

# Access at http://localhost:3002
```

## Deploying with External Database

### Quick Start with External Database

```bash
# 1. Copy and customize the external database values
cp k8s/mail2feed/values-external-db.yaml k8s/mail2feed/values-my-external-db.yaml
# Edit the file with your database details

# 2. Test the configuration
./scripts/k8s-test.sh

# 3. Deploy with external database
./scripts/k8s-deploy.sh -e external-db
```

### Using Kubernetes Secrets for Database Credentials

```bash
# 1. Create database credentials secret
kubectl create secret generic mail2feed-db-credentials \
  --namespace mail2feed-prod \
  --from-literal=password=your-secure-password \
  --from-literal=connection-string=postgres://user:password@host:5432/database?sslmode=require

# 2. Deploy using the secret-based configuration
cp k8s/mail2feed/values-external-secret.yaml k8s/mail2feed/values-prod-external.yaml
# Edit values-prod-external.yaml with your database host and settings

# 3. Deploy
helm upgrade --install mail2feed-prod k8s/mail2feed/ \
  --namespace mail2feed-prod \
  --values k8s/mail2feed/values.yaml \
  --values k8s/mail2feed/values-prod-external.yaml \
  --create-namespace
```

## Architecture

The deployment consists of:

- **Backend**: Rust application serving the REST API
- **Frontend**: React application served by nginx
- **PostgreSQL**: Database (via Bitnami Helm chart)
- **pgAdmin**: Database administration tool (dev only)
- **Ingress**: HTTP routing (configurable)

## Configuration

### Environments

#### Development (`values-dev.yaml`)
- Single replica for each service
- pgAdmin enabled
- Debug logging
- Local ingress setup
- Smaller resource requests

#### Production (`values-prod.yaml`)
- Multiple replicas for high availability
- pgAdmin disabled
- Info-level logging
- TLS/SSL configuration
- Larger resource limits
- External secrets for database credentials

### Custom Configuration

Create your own values file:

```bash
cp k8s/mail2feed/values.yaml k8s/mail2feed/values-custom.yaml
# Edit values-custom.yaml with your settings
./scripts/k8s-deploy.sh -e custom
```

## Deployment Scripts

### k8s-test.sh

Validates the Helm chart and generates test manifests:

```bash
./scripts/k8s-test.sh
```

Output files:
- `/tmp/k8s-test-default.yaml` - Default values
- `/tmp/k8s-test-dev.yaml` - Development values  
- `/tmp/k8s-test-prod.yaml` - Production values

### k8s-deploy.sh

Deploys mail2feed to Kubernetes:

```bash
# Deploy to development
./scripts/k8s-deploy.sh -e dev

# Deploy to production
./scripts/k8s-deploy.sh -e prod

# Custom namespace and release name
./scripts/k8s-deploy.sh -e dev -n my-namespace -r my-release

# Other actions
./scripts/k8s-deploy.sh -e dev -a status    # Check status
./scripts/k8s-deploy.sh -e dev -a upgrade   # Upgrade existing
./scripts/k8s-deploy.sh -e dev -a delete    # Delete deployment
```

## Building Docker Images

### Backend
```bash
cd backend
docker build -t mail2feed/backend:latest .
docker build -t mail2feed/backend:dev -f Dockerfile.dev .
```

### Frontend
```bash
cd frontend  
docker build -t mail2feed/frontend:latest .
docker build -t mail2feed/frontend:dev -f Dockerfile.dev .
```

### Push to Registry
```bash
# Tag for your registry
docker tag mail2feed/backend:latest your-registry/mail2feed/backend:latest
docker tag mail2feed/frontend:latest your-registry/mail2feed/frontend:latest

# Push to registry
docker push your-registry/mail2feed/backend:latest
docker push your-registry/mail2feed/frontend:latest

# Update values file with your registry
# backend.image.repository: your-registry/mail2feed/backend
# frontend.image.repository: your-registry/mail2feed/frontend
```

## Database Setup

The deployment supports two database configurations:

1. **Internal PostgreSQL** (default): Uses the Bitnami PostgreSQL Helm chart
2. **External Database**: Connects to an external PostgreSQL database (RDS, Cloud SQL, etc.)

### Internal PostgreSQL (Default)

The default configuration deploys PostgreSQL inside your Kubernetes cluster using the Bitnami Helm chart. This is suitable for development and small production deployments.

```yaml
# values.yaml (default)
postgresql:
  enabled: true
  auth:
    database: mail2feed
    username: mail2feed_user
    password: mail2feed_password
```

### External Database Configuration

For production deployments, you'll often want to use a managed database service. Set `postgresql.enabled: false` and configure the `externalDatabase` section.

#### Option 1: Direct Password Configuration

```yaml
# values-external-db.yaml
postgresql:
  enabled: false

externalDatabase:
  host: "your-database-host.amazonaws.com"
  port: 5432
  database: mail2feed
  username: mail2feed_user
  password: "your-secure-password"
  sslmode: require
  connectionParams: "connect_timeout=30"
```

#### Option 2: Using Kubernetes Secrets (Recommended)

For better security, store credentials in Kubernetes secrets:

```bash
# Create the secret first
kubectl create secret generic mail2feed-db-credentials \
  --namespace mail2feed-prod \
  --from-literal=password=your-secure-password \
  --from-literal=connection-string=postgres://mail2feed_user:your-secure-password@your-db-host:5432/mail2feed?sslmode=require
```

```yaml
# values-external-secret.yaml
postgresql:
  enabled: false

externalDatabase:
  host: "your-database-host.amazonaws.com"
  port: 5432
  database: mail2feed
  username: mail2feed_user
  existingSecret: "mail2feed-db-credentials"
  existingSecretPasswordKey: "password"
  sslmode: require
```

#### External Database Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `externalDatabase.host` | Database hostname | `""` |
| `externalDatabase.port` | Database port | `5432` |
| `externalDatabase.database` | Database name | `mail2feed` |
| `externalDatabase.username` | Database username | `mail2feed_user` |
| `externalDatabase.password` | Database password (if not using secret) | `""` |
| `externalDatabase.existingSecret` | Name of existing secret with credentials | `""` |
| `externalDatabase.existingSecretPasswordKey` | Key in secret containing password | `"password"` |
| `externalDatabase.sslmode` | SSL mode for connection | `require` |
| `externalDatabase.connectionParams` | Additional connection parameters | `""` |

#### SSL Modes

| Mode | Description |
|------|-------------|
| `disable` | No SSL encryption |
| `allow` | SSL if available, but not required |
| `prefer` | Prefer SSL, fallback to non-SSL |
| `require` | Require SSL, fail if unavailable |
| `verify-ca` | Require SSL and verify CA |
| `verify-full` | Require SSL and verify CA and hostname |

### Example: AWS RDS Configuration

```yaml
postgresql:
  enabled: false

externalDatabase:
  host: "mail2feed-prod.cluster-xyz.us-west-2.rds.amazonaws.com"
  port: 5432
  database: mail2feed
  username: mail2feed_user
  existingSecret: "rds-credentials"
  existingSecretPasswordKey: "password"
  sslmode: require
  connectionParams: "connect_timeout=30"
```

### Example: Google Cloud SQL Configuration

```yaml
postgresql:
  enabled: false

externalDatabase:
  host: "10.1.2.3"  # Private IP of Cloud SQL instance
  port: 5432
  database: mail2feed
  username: mail2feed_user
  existingSecret: "cloudsql-credentials"
  existingSecretPasswordKey: "password"
  sslmode: require
```

### Database Migrations

Database migrations are handled automatically by the backend application on startup. For external databases, ensure:

1. The database exists and is accessible
2. The user has appropriate permissions (CREATE, ALTER, INSERT, UPDATE, DELETE, SELECT)
3. Network connectivity is available from your Kubernetes cluster

#### Manual Migration (if needed)
```bash
# Get backend pod name
kubectl get pods --namespace mail2feed-prod

# Run migrations manually
kubectl exec --namespace mail2feed-prod -it <backend-pod> -- ./mail2feed-backend migrate
```

### Database Backup Considerations

When using external databases:
- **AWS RDS**: Use automated backups and point-in-time recovery
- **Google Cloud SQL**: Enable automated backups and configure retention
- **Azure Database**: Use geo-redundant backup storage
- **Self-managed**: Implement regular pg_dump backups

### Connection Pooling

For high-traffic deployments, consider using connection poolers:
- **PgBouncer**: Lightweight connection pooler
- **Cloud-native solutions**: AWS RDS Proxy, Google Cloud SQL Auth proxy

## Monitoring and Troubleshooting

### Check Pod Status
```bash
kubectl get pods --namespace mail2feed-dev
kubectl describe pod --namespace mail2feed-dev <pod-name>
```

### View Logs
```bash
# Backend logs
kubectl logs --namespace mail2feed-dev -l app.kubernetes.io/component=backend

# Frontend logs
kubectl logs --namespace mail2feed-dev -l app.kubernetes.io/component=frontend

# Database logs
kubectl logs --namespace mail2feed-dev -l app.kubernetes.io/name=postgresql
```

### Access Services
```bash
# Frontend
kubectl port-forward --namespace mail2feed-dev svc/mail2feed-dev-frontend 3002:3002

# Backend API
kubectl port-forward --namespace mail2feed-dev svc/mail2feed-dev-backend 3001:3001

# pgAdmin (dev only)
kubectl port-forward --namespace mail2feed-dev svc/mail2feed-dev-pgadmin 8080:80

# PostgreSQL
kubectl port-forward --namespace mail2feed-dev svc/mail2feed-dev-postgresql 5432:5432
```

## Security Considerations

### Production Secrets
For production deployments, use Kubernetes secrets:

```bash
# Create database secret
kubectl create secret generic mail2feed-postgres-secret \
  --namespace mail2feed-prod \
  --from-literal=password=your-secure-password

# Create TLS secret (if using custom certificates)
kubectl create secret tls mail2feed-tls \
  --namespace mail2feed-prod \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem
```

### Resource Limits
Configure appropriate resource limits in production:

```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi
```

### Network Policies
Consider implementing network policies to restrict pod-to-pod communication.

## Helm Chart Structure

```
k8s/mail2feed/
├── Chart.yaml                    # Chart metadata
├── values.yaml                   # Default values
├── values-dev.yaml               # Development overrides
├── values-prod.yaml              # Production overrides
└── templates/
    ├── _helpers.tpl              # Template helpers
    ├── serviceaccount.yaml       # Service account
    ├── ingress.yaml              # Ingress configuration
    ├── backend/
    │   ├── deployment.yaml       # Backend deployment
    │   └── service.yaml          # Backend service
    ├── frontend/
    │   ├── deployment.yaml       # Frontend deployment
    │   └── service.yaml          # Frontend service
    └── pgadmin/
        ├── deployment.yaml       # pgAdmin deployment
        └── service.yaml          # pgAdmin service
```

## Support

For issues related to Kubernetes deployment:
1. Check the generated manifests: `./scripts/k8s-test.sh`
2. Verify pod logs and status
3. Ensure Docker images are accessible from your cluster
4. Check network connectivity between services