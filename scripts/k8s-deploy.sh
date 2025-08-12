#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
NAMESPACE=""
RELEASE_NAME=""
ACTION="deploy"
VALUES_FILE=""

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Help function
show_help() {
    echo "Usage: $0 -e ENVIRONMENT [-n NAMESPACE] [-r RELEASE_NAME] [-a ACTION]"
    echo ""
    echo "Deploy mail2feed to Kubernetes using Helm"
    echo ""
    echo "Options:"
    echo "  -e ENVIRONMENT    Environment to deploy (dev, prod)"
    echo "  -n NAMESPACE      Kubernetes namespace (default: mail2feed-ENVIRONMENT)"
    echo "  -r RELEASE_NAME   Helm release name (default: mail2feed-ENVIRONMENT)"
    echo "  -a ACTION         Action to perform (deploy, upgrade, delete, status)"
    echo "  -h                Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev                    # Deploy to development environment"
    echo "  $0 -e prod                   # Deploy to production environment"
    echo "  $0 -e dev -a delete          # Delete development deployment"
    echo "  $0 -e dev -a status          # Check deployment status"
}

# Parse command line arguments
while getopts "e:n:r:a:h" opt; do
    case $opt in
        e)
            ENVIRONMENT="$OPTARG"
            ;;
        n)
            NAMESPACE="$OPTARG"
            ;;
        r)
            RELEASE_NAME="$OPTARG"
            ;;
        a)
            ACTION="$OPTARG"
            ;;
        h)
            show_help
            exit 0
            ;;
        \?)
            echo -e "${RED}Invalid option: -$OPTARG${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$ENVIRONMENT" ]; then
    echo -e "${RED}Error: Environment (-e) is required${NC}"
    show_help
    exit 1
fi

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "external-db" ] && [ "$ENVIRONMENT" != "external-secret" ]; then
    echo -e "${RED}Error: Environment must be 'dev', 'prod', 'external-db', or 'external-secret'${NC}"
    exit 1
fi

# Set default values if not provided
if [ -z "$NAMESPACE" ]; then
    NAMESPACE="mail2feed-$ENVIRONMENT"
fi

if [ -z "$RELEASE_NAME" ]; then
    RELEASE_NAME="mail2feed-$ENVIRONMENT"
fi

VALUES_FILE="$PROJECT_DIR/k8s/mail2feed/values-$ENVIRONMENT.yaml"

echo -e "${BLUE}Mail2Feed Kubernetes Deployment${NC}"
echo "================================"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"
echo "Action: $ACTION"
echo ""

# Check prerequisites
if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: Helm is not installed${NC}"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: No Kubernetes cluster available${NC}"
    exit 1
fi

# Check if values file exists
if [ ! -f "$VALUES_FILE" ]; then
    echo -e "${RED}Error: Values file not found: $VALUES_FILE${NC}"
    exit 1
fi

# Navigate to k8s directory
cd "$PROJECT_DIR/k8s"

# Perform the requested action
case $ACTION in
    "deploy"|"install")
        echo -e "${YELLOW}Creating namespace if it doesn't exist...${NC}"
        kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        echo -e "${YELLOW}Adding Bitnami Helm repository...${NC}"
        helm repo add bitnami https://charts.bitnami.com/bitnami
        helm repo update
        
        echo -e "${YELLOW}Installing mail2feed...${NC}"
        helm upgrade --install "$RELEASE_NAME" mail2feed/ \
            --namespace "$NAMESPACE" \
            --values "mail2feed/values.yaml" \
            --values "$VALUES_FILE" \
            --wait \
            --timeout 10m
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Deployment successful!${NC}"
        else
            echo -e "${RED}✗ Deployment failed${NC}"
            exit 1
        fi
        ;;
    
    "upgrade")
        echo -e "${YELLOW}Upgrading mail2feed...${NC}"
        helm upgrade "$RELEASE_NAME" mail2feed/ \
            --namespace "$NAMESPACE" \
            --values "mail2feed/values.yaml" \
            --values "$VALUES_FILE" \
            --wait \
            --timeout 10m
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Upgrade successful!${NC}"
        else
            echo -e "${RED}✗ Upgrade failed${NC}"
            exit 1
        fi
        ;;
    
    "delete"|"uninstall")
        echo -e "${YELLOW}Deleting mail2feed deployment...${NC}"
        helm uninstall "$RELEASE_NAME" --namespace "$NAMESPACE"
        
        read -p "Do you want to delete the namespace '$NAMESPACE' as well? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kubectl delete namespace "$NAMESPACE"
            echo -e "${GREEN}✓ Namespace deleted${NC}"
        fi
        
        echo -e "${GREEN}✓ Deployment deleted!${NC}"
        ;;
    
    "status")
        echo -e "${YELLOW}Checking deployment status...${NC}"
        helm status "$RELEASE_NAME" --namespace "$NAMESPACE"
        
        echo ""
        echo -e "${YELLOW}Pod status:${NC}"
        kubectl get pods --namespace "$NAMESPACE"
        
        echo ""
        echo -e "${YELLOW}Service status:${NC}"
        kubectl get services --namespace "$NAMESPACE"
        ;;
    
    *)
        echo -e "${RED}Error: Unknown action '$ACTION'${NC}"
        echo "Valid actions: deploy, upgrade, delete, status"
        exit 1
        ;;
esac

# Show helpful information after deployment
if [ "$ACTION" = "deploy" ] || [ "$ACTION" = "install" ] || [ "$ACTION" = "upgrade" ]; then
    echo ""
    echo -e "${BLUE}Deployment Information:${NC}"
    echo "======================"
    
    # Get service information
    echo -e "${YELLOW}Services:${NC}"
    kubectl get services --namespace "$NAMESPACE"
    
    echo ""
    echo -e "${YELLOW}Access Information:${NC}"
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo "Frontend: kubectl port-forward --namespace $NAMESPACE svc/$RELEASE_NAME-frontend 3002:3002"
        echo "Backend:  kubectl port-forward --namespace $NAMESPACE svc/$RELEASE_NAME-backend 3001:3001"
        if kubectl get service "$RELEASE_NAME-pgadmin" --namespace "$NAMESPACE" &> /dev/null; then
            echo "pgAdmin:  kubectl port-forward --namespace $NAMESPACE svc/$RELEASE_NAME-pgadmin 8080:80"
        fi
    fi
    
    echo ""
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "Check logs:   kubectl logs --namespace $NAMESPACE -l app.kubernetes.io/name=mail2feed"
    echo "Get pods:     kubectl get pods --namespace $NAMESPACE"
    echo "Describe:     kubectl describe deployment --namespace $NAMESPACE"
fi