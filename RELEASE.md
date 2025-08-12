# Release Management Guide

This document describes how to build, version, and release mail2feed components including container images and Helm charts.

## Overview

The mail2feed project uses automated CI/CD workflows to:
- Build and test code changes
- Create multi-architecture container images
- Package and publish Helm charts
- Generate GitHub releases with complete artifacts

## Release Strategy

### Versioning
- **Semantic Versioning**: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
- **Pre-releases**: `MAJOR.MINOR.PATCH-PRERELEASE` (e.g., `1.2.3-beta.1`, `1.2.3-rc.1`)
- **Git Tags**: Prefixed with `v` (e.g., `v1.2.3`)

### Components
1. **Backend**: Rust application container image
2. **Frontend**: React application container image  
3. **Helm Chart**: Kubernetes deployment package

## Automated Release Process

### Creating a Release

The simplest way to create a release:

```bash
# Prepare and create release v1.0.0
./scripts/release.sh 1.0.0

# Create a beta release
./scripts/release.sh 1.0.0-beta.1

# Dry run to see what would happen
./scripts/release.sh --dry-run 1.0.0
```

### What Happens Automatically

When you push a version tag (e.g., `v1.0.0`), GitHub Actions will:

1. **Build Images** (`release.yml`)
   - Build multi-arch containers (amd64, arm64)
   - Push to GitHub Container Registry
   - Tag with version and latest

2. **Package Helm Chart** (`release.yml`)
   - Update chart version and app version
   - Update image references to use new tags
   - Build dependencies and package chart
   - Upload chart to GitHub Releases

3. **Publish to OCI Registry** (`helm-oci.yml`)
   - Push Helm chart to GitHub Container Registry
   - Enable `helm install oci://` usage

4. **Create GitHub Release**
   - Generate release notes
   - Attach chart files
   - Include deployment instructions

## Manual Build Process

### Building Container Images

```bash
# Build images locally with dev tag
./scripts/build-images.sh -t dev

# Build and push to registry
./scripts/build-images.sh -t v1.0.0 -r ghcr.io -o myorg/mail2feed --push

# Build multi-architecture images
./scripts/build-images.sh --multi-arch --push
```

### Updating Helm Chart Images

```bash
# Update chart to use new image tags
./scripts/update-helm-images.sh -t v1.0.0

# Use custom registry
./scripts/update-helm-images.sh -t v1.0.0 -r my-registry.com -o myorg/mail2feed

# Dry run to preview changes
./scripts/update-helm-images.sh --dry-run -t v1.0.0
```

### Manual Helm Chart Release

```bash
# Build dependencies
cd k8s && helm dependency build mail2feed/

# Package chart
helm package mail2feed/ --version 1.0.0

# Push to OCI registry (if configured)
helm push mail2feed-1.0.0.tgz oci://ghcr.io/myorg/mail2feed/helm
```

## Container Images

### Registries

**GitHub Container Registry** (Primary):
- Backend: `ghcr.io/matburt/mail2feed/backend:TAG`
- Frontend: `ghcr.io/matburt/mail2feed/frontend:TAG`

### Image Tags

- **Release versions**: `v1.0.0`, `1.0.0`
- **Major/minor**: `v1`, `v1.0` 
- **Branch builds**: `main`, `develop`
- **Commit SHA**: `sha-abc1234`

### Multi-Architecture Support

Images are built for:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, Apple Silicon, ARM servers)

## Helm Chart Management

### Chart Versioning

- **Chart Version**: Matches application version (1.0.0)
- **App Version**: Application version being deployed (1.0.0)
- **Dependencies**: Locked to specific versions (PostgreSQL 12.x)

### Publishing Locations

1. **GitHub Releases** (Traditional)
   ```bash
   # Download and install
   wget https://github.com/matburt/mail2feed/releases/download/v1.0.0/mail2feed-1.0.0.tgz
   helm install mail2feed mail2feed-1.0.0.tgz
   ```

2. **OCI Registry** (Modern)
   ```bash
   # Install directly from registry
   helm install mail2feed oci://ghcr.io/matburt/mail2feed/helm/mail2feed --version 1.0.0
   ```

## Development Workflow

### Pre-Release Testing

```bash
# Run all tests
./scripts/k8s-test.sh

# Test with external database
helm template test k8s/mail2feed/ --values k8s/mail2feed/values-external-db.yaml

# Validate Kubernetes manifests
kubectl apply --dry-run=client -f <(helm template test k8s/mail2feed/)
```

### Branch Strategy

- **main**: Production releases (`v1.0.0`)
- **develop**: Development builds (`develop`)
- **feature/***: Feature branches (no automatic builds)
- **hotfix/***: Hotfix branches (patch releases)

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated (if maintained)
- [ ] Version numbers consistent
- [ ] Security scan results reviewed
- [ ] Database migrations tested
- [ ] Backup/rollback plan prepared

## Environment-Specific Deployments

### Development

```bash
# Use development images and settings
helm install mail2feed-dev k8s/mail2feed/ \
  --values k8s/mail2feed/values-dev.yaml \
  --set backend.image.tag=develop \
  --set frontend.image.tag=develop
```

### Staging

```bash
# Use release candidate
helm install mail2feed-staging k8s/mail2feed/ \
  --values k8s/mail2feed/values-prod.yaml \
  --set backend.image.tag=v1.0.0-rc.1 \
  --set frontend.image.tag=v1.0.0-rc.1
```

### Production

```bash
# Use stable release with external database
helm install mail2feed-prod k8s/mail2feed/ \
  --values k8s/mail2feed/values-prod.yaml \
  --values k8s/mail2feed/values-external-secret.yaml \
  --version 1.0.0
```

## Rollback Procedures

### Application Rollback

```bash
# Rollback to previous release
helm rollback mail2feed-prod

# Rollback to specific revision
helm rollback mail2feed-prod 2

# Check rollback history
helm history mail2feed-prod
```

### Image Rollback

```bash
# Downgrade to previous version
helm upgrade mail2feed-prod k8s/mail2feed/ \
  --set backend.image.tag=v1.0.0 \
  --set frontend.image.tag=v1.0.0
```

## Security Considerations

### Image Security

- **Base Images**: Use minimal, security-hardened base images
- **Non-root**: All containers run as non-root users
- **Scanning**: Automated vulnerability scanning in CI/CD
- **Secrets**: Database credentials via Kubernetes secrets

### Chart Security

- **RBAC**: Minimal required permissions
- **Network Policies**: Restrict pod-to-pod communication
- **Security Contexts**: Pod and container security settings
- **Resource Limits**: Prevent resource exhaustion

## Monitoring Releases

### GitHub Actions

Monitor build and release progress:
- **Actions Tab**: View workflow runs
- **Releases**: Check published releases
- **Packages**: Monitor container images

### Registry Monitoring

```bash
# List available images
docker search ghcr.io/matburt/mail2feed

# Pull and inspect images
docker pull ghcr.io/matburt/mail2feed/backend:v1.0.0
docker inspect ghcr.io/matburt/mail2feed/backend:v1.0.0
```

### Helm Monitoring

```bash
# List chart versions
helm search repo mail2feed --versions

# Show chart information
helm show chart oci://ghcr.io/matburt/mail2feed/helm/mail2feed --version 1.0.0
```

## Troubleshooting

### Build Failures

1. **Check GitHub Actions logs**
2. **Verify dependencies and versions**
3. **Test builds locally first**
4. **Validate Dockerfile syntax**

### Release Issues

1. **Verify tag format** (`v1.0.0`)
2. **Check branch permissions**
3. **Validate semantic versioning**
4. **Review release script logs**

### Deployment Problems

1. **Test Helm templates locally**
2. **Verify image availability**
3. **Check Kubernetes compatibility**
4. **Validate external dependencies**

## Best Practices

### Before Releasing

- Test on staging environment
- Review security scan results
- Validate database migrations
- Check resource requirements
- Document breaking changes

### During Release

- Monitor build progress
- Test deployment immediately
- Verify health checks
- Check monitoring/logging
- Prepare rollback if needed

### After Release

- Update documentation
- Monitor error rates
- Update dependent systems
- Plan next release cycle
- Archive old releases

## Support

For release-related issues:
1. Check GitHub Actions logs
2. Review this documentation
3. Test locally using provided scripts
4. Create GitHub issue with details