#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}Mail2Feed Kubernetes Test Script${NC}"
echo "=================================="

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: Helm is not installed${NC}"
    echo "Please install Helm: https://helm.sh/docs/intro/install/"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    echo "Please install kubectl: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if we have a Kubernetes context
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: No Kubernetes cluster available${NC}"
    echo "Please ensure you have a running Kubernetes cluster and valid kubeconfig"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Navigate to k8s directory
cd "$PROJECT_DIR/k8s"

# Validate Helm chart syntax
echo -e "${YELLOW}Validating Helm chart syntax...${NC}"
if helm lint mail2feed/; then
    echo -e "${GREEN}✓ Helm chart syntax is valid${NC}"
else
    echo -e "${RED}✗ Helm chart syntax validation failed${NC}"
    exit 1
fi

# Test template rendering with default values
echo -e "${YELLOW}Testing template rendering with default values...${NC}"
helm template mail2feed-test mail2feed/ --dry-run > /tmp/k8s-test-default.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Default template rendering successful${NC}"
    echo "Output saved to /tmp/k8s-test-default.yaml"
else
    echo -e "${RED}✗ Default template rendering failed${NC}"
    exit 1
fi

# Test template rendering with dev values
echo -e "${YELLOW}Testing template rendering with dev values...${NC}"
helm template mail2feed-test mail2feed/ --values mail2feed/values-dev.yaml --dry-run > /tmp/k8s-test-dev.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dev template rendering successful${NC}"
    echo "Output saved to /tmp/k8s-test-dev.yaml"
else
    echo -e "${RED}✗ Dev template rendering failed${NC}"
    exit 1
fi

# Test template rendering with prod values
echo -e "${YELLOW}Testing template rendering with prod values...${NC}"
helm template mail2feed-test mail2feed/ --values mail2feed/values-prod.yaml --dry-run > /tmp/k8s-test-prod.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Production template rendering successful${NC}"
    echo "Output saved to /tmp/k8s-test-prod.yaml"
else
    echo -e "${RED}✗ Production template rendering failed${NC}"
    exit 1
fi

# Validate generated Kubernetes manifests
echo -e "${YELLOW}Validating generated Kubernetes manifests...${NC}"
kubectl apply --dry-run=client -f /tmp/k8s-test-default.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Kubernetes manifest validation successful${NC}"
else
    echo -e "${RED}✗ Kubernetes manifest validation failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Generated test files:"
echo "  - /tmp/k8s-test-default.yaml (default values)"
echo "  - /tmp/k8s-test-dev.yaml (development values)"
echo "  - /tmp/k8s-test-prod.yaml (production values)"
echo ""
echo "Next steps:"
echo "  1. Review the generated manifests"
echo "  2. Deploy to a test cluster: ./scripts/k8s-deploy.sh -e dev"
echo "  3. Test the application functionality"