#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TAG="dev"
REGISTRY="ghcr.io"
REPOSITORY=""
PUSH=false
PLATFORM="linux/amd64"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Build container images for mail2feed"
    echo ""
    echo "Options:"
    echo "  -t, --tag TAG         Image tag (default: dev)"
    echo "  -r, --registry REG    Registry URL (default: ghcr.io)"
    echo "  -o, --repo REPO       Repository name (e.g., username/mail2feed)"
    echo "  -p, --push            Push images after building"
    echo "  --platform PLATFORM  Target platform (default: linux/amd64)"
    echo "  --multi-arch          Build for multiple architectures (linux/amd64,linux/arm64)"
    echo "  -h, --help            Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 -t v1.0.0 -r ghcr.io -o myorg/mail2feed -p"
    echo "  $0 --multi-arch --push"
}

# Parse command line arguments
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
        -p|--push)
            PUSH=true
            shift
            ;;
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --multi-arch)
            PLATFORM="linux/amd64,linux/arm64"
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

# Set default repository if not provided
if [ -z "$REPOSITORY" ]; then
    if command -v git &> /dev/null; then
        REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
        if [[ "$REMOTE_URL" =~ github.com[:/]([^/]+)/([^/.]+) ]]; then
            REPOSITORY="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
        fi
    fi
    
    if [ -z "$REPOSITORY" ]; then
        REPOSITORY="mail2feed/mail2feed"
        echo -e "${YELLOW}Warning: Using default repository name: $REPOSITORY${NC}"
    fi
fi

# Construct image names
BACKEND_IMAGE="$REGISTRY/$REPOSITORY/backend:$TAG"
FRONTEND_IMAGE="$REGISTRY/$REPOSITORY/frontend:$TAG"

echo -e "${BLUE}Building Mail2Feed Container Images${NC}"
echo "===================================="
echo "Registry: $REGISTRY"
echo "Repository: $REPOSITORY"
echo "Tag: $TAG"
echo "Platform(s): $PLATFORM"
echo "Push: $PUSH"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Build backend image
echo -e "${YELLOW}Building backend image: $BACKEND_IMAGE${NC}"
cd "$PROJECT_DIR"

if docker build \
    --platform "$PLATFORM" \
    --tag "$BACKEND_IMAGE" \
    --file backend/Dockerfile \
    backend/; then
    echo -e "${GREEN}✓ Backend image built successfully${NC}"
else
    echo -e "${RED}✗ Backend image build failed${NC}"
    exit 1
fi

# Build frontend image
echo -e "${YELLOW}Building frontend image: $FRONTEND_IMAGE${NC}"
if docker build \
    --platform "$PLATFORM" \
    --tag "$FRONTEND_IMAGE" \
    --file frontend/Dockerfile \
    frontend/; then
    echo -e "${GREEN}✓ Frontend image built successfully${NC}"
else
    echo -e "${RED}✗ Frontend image build failed${NC}"
    exit 1
fi

# Push images if requested
if [ "$PUSH" = true ]; then
    echo -e "${YELLOW}Pushing images to registry...${NC}"
    
    if docker push "$BACKEND_IMAGE"; then
        echo -e "${GREEN}✓ Backend image pushed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to push backend image${NC}"
        exit 1
    fi
    
    if docker push "$FRONTEND_IMAGE"; then
        echo -e "${GREEN}✓ Frontend image pushed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to push frontend image${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo ""
echo "Images built:"
echo "  Backend:  $BACKEND_IMAGE"
echo "  Frontend: $FRONTEND_IMAGE"
echo ""

if [ "$PUSH" = false ]; then
    echo "To push these images:"
    echo "  docker push $BACKEND_IMAGE"
    echo "  docker push $FRONTEND_IMAGE"
    echo ""
    echo "Or run this script with --push flag"
fi

echo "To update Helm values with these images:"
echo "  ./scripts/update-helm-images.sh -t $TAG -r $REGISTRY -o $REPOSITORY"