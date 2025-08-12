#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TAG=""
REGISTRY="ghcr.io"
REPOSITORY=""

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Update Helm chart values with new image references"
    echo ""
    echo "Options:"
    echo "  -t, --tag TAG         Image tag (required)"
    echo "  -r, --registry REG    Registry URL (default: ghcr.io)"
    echo "  -o, --repo REPO       Repository name (auto-detect from git if not provided)"
    echo "  --dry-run             Show changes without applying them"
    echo "  -h, --help            Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 -t v1.0.0"
    echo "  $0 -t dev -r localhost:5000 -o myorg/mail2feed"
}

# Parse command line arguments
DRY_RUN=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -o|--repo)
            REPOSITORY="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$TAG" ]; then
    echo -e "${RED}Error: Tag (-t) is required${NC}"
    show_help
    exit 1
fi

# Set default repository if not provided
if [ -z "$REPOSITORY" ]; then
    if command -v git &> /dev/null; then
        REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
        if [[ "$REMOTE_URL" =~ github.com[:/]([^/]+)/([^/.]+) ]]; then
            REPOSITORY="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
        fi
    fi
    
    if [ -z "$REPOSITORY" ]; then
        echo -e "${RED}Error: Repository name could not be determined${NC}"
        echo "Please provide it with -o option"
        exit 1
    fi
fi

REPO_LOWER=$(echo "$REPOSITORY" | tr '[:upper:]' '[:lower:]')
BACKEND_IMAGE="$REGISTRY/$REPO_LOWER/backend"
FRONTEND_IMAGE="$REGISTRY/$REPO_LOWER/frontend"

echo -e "${BLUE}Updating Helm Chart Images${NC}"
echo "=========================="
echo "Registry: $REGISTRY"
echo "Repository: $REPO_LOWER"
echo "Tag: $TAG"
echo "Backend Image: $BACKEND_IMAGE:$TAG"
echo "Frontend Image: $FRONTEND_IMAGE:$TAG"
echo "Dry Run: $DRY_RUN"
echo ""

# Navigate to project directory
cd "$PROJECT_DIR"

# Find all values files
VALUES_FILES=(
    "k8s/mail2feed/values.yaml"
    "k8s/mail2feed/values-dev.yaml"
    "k8s/mail2feed/values-prod.yaml"
    "k8s/mail2feed/values-external-db.yaml"
    "k8s/mail2feed/values-external-secret.yaml"
)

for VALUES_FILE in "${VALUES_FILES[@]}"; do
    if [ -f "$VALUES_FILE" ]; then
        echo -e "${YELLOW}Updating $VALUES_FILE...${NC}"
        
        if [ "$DRY_RUN" = true ]; then
            echo "Would update:"
            echo "  Backend repository: mail2feed/backend -> $BACKEND_IMAGE"
            echo "  Frontend repository: mail2feed/frontend -> $FRONTEND_IMAGE"
            echo "  Image tag: -> $TAG"
        else
            # Update backend image repository
            sed -i.bak "s|repository: mail2feed/backend|repository: $BACKEND_IMAGE|g" "$VALUES_FILE"
            sed -i.bak "s|repository: ghcr\.io/.*/backend|repository: $BACKEND_IMAGE|g" "$VALUES_FILE"
            
            # Update frontend image repository  
            sed -i.bak "s|repository: mail2feed/frontend|repository: $FRONTEND_IMAGE|g" "$VALUES_FILE"
            sed -i.bak "s|repository: ghcr\.io/.*/frontend|repository: $FRONTEND_IMAGE|g" "$VALUES_FILE"
            
            # Update image tags
            sed -i.bak "s/tag: \".*\"/tag: \"$TAG\"/g" "$VALUES_FILE"
            
            # Remove backup files
            rm -f "$VALUES_FILE.bak"
            
            echo -e "${GREEN}✓ Updated $VALUES_FILE${NC}"
        fi
    else
        echo -e "${YELLOW}Warning: $VALUES_FILE not found, skipping${NC}"
    fi
done

# Update Chart.yaml appVersion if this is a version tag
if [[ "$TAG" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    CHART_VERSION=${TAG#v}  # Remove 'v' prefix if present
    CHART_FILE="k8s/mail2feed/Chart.yaml"
    
    if [ -f "$CHART_FILE" ]; then
        echo -e "${YELLOW}Updating Chart.yaml appVersion...${NC}"
        
        if [ "$DRY_RUN" = true ]; then
            echo "Would update appVersion to: $CHART_VERSION"
        else
            sed -i.bak "s/appVersion: .*/appVersion: \"$CHART_VERSION\"/" "$CHART_FILE"
            rm -f "$CHART_FILE.bak"
            echo -e "${GREEN}✓ Updated appVersion to $CHART_VERSION${NC}"
        fi
    fi
fi

echo ""
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}Dry run completed. No files were modified.${NC}"
    echo "Run without --dry-run to apply changes."
else
    echo -e "${GREEN}🎉 Helm chart images updated successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Test the updated chart: ./scripts/k8s-test.sh"
    echo "  2. Commit the changes: git add k8s/ && git commit -m 'Update image tags to $TAG'"
    echo "  3. Deploy: ./scripts/k8s-deploy.sh -e dev"
fi