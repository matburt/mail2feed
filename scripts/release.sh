#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
VERSION=""
DRY_RUN=false
SKIP_TESTS=false
BRANCH="main"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

show_help() {
    echo "Usage: $0 [OPTIONS] VERSION"
    echo ""
    echo "Prepare and create a new release"
    echo ""
    echo "Arguments:"
    echo "  VERSION               Version to release (e.g., 1.0.0, 1.0.0-beta.1)"
    echo ""
    echo "Options:"
    echo "  -b, --branch BRANCH   Branch to release from (default: main)"
    echo "  --dry-run             Show what would be done without making changes"
    echo "  --skip-tests          Skip running tests before release"
    echo "  -h, --help            Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 1.0.0              # Release version 1.0.0 from main branch"
    echo "  $0 1.0.0-beta.1       # Release beta version"
    echo "  $0 --dry-run 1.0.0    # Show what would happen"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
        *)
            if [ -z "$VERSION" ]; then
                VERSION="$1"
            else
                echo -e "${RED}Too many arguments${NC}"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate required arguments
if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Version is required${NC}"
    show_help
    exit 1
fi

# Validate version format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+(\.[0-9]+)?)?$ ]]; then
    echo -e "${RED}Error: Invalid version format. Use semantic versioning (e.g., 1.0.0, 1.0.0-beta.1)${NC}"
    exit 1
fi

TAG="v$VERSION"

echo -e "${BLUE}Mail2Feed Release Preparation${NC}"
echo "============================"
echo "Version: $VERSION"
echo "Tag: $TAG"
echo "Branch: $BRANCH"
echo "Dry Run: $DRY_RUN"
echo ""

# Navigate to project directory
cd "$PROJECT_DIR"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check if working directory is clean
if [ "$DRY_RUN" = false ]; then
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo -e "${RED}Error: Working directory is not clean${NC}"
        echo "Please commit or stash your changes before releasing"
        exit 1
    fi
fi

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo -e "${YELLOW}Switching to $BRANCH branch...${NC}"
    if [ "$DRY_RUN" = false ]; then
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    fi
fi

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo -e "${RED}Error: Tag $TAG already exists${NC}"
    exit 1
fi

# Run tests unless skipped
if [ "$SKIP_TESTS" = false ]; then
    echo -e "${YELLOW}Running tests...${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        # Backend tests
        echo "Running backend tests..."
        cd backend
        cargo test
        cargo clippy -- -D warnings
        cargo fmt --check
        cd ..
        
        # Frontend tests
        echo "Running frontend tests..."
        cd frontend
        npm run lint
        npm run type-check  
        npm run test
        npm run build
        cd ..
        
        # Helm tests
        echo "Running Helm tests..."
        ./scripts/k8s-test.sh
        
        echo -e "${GREEN}✓ All tests passed${NC}"
    else
        echo "Would run: backend tests, frontend tests, helm tests"
    fi
else
    echo -e "${YELLOW}Skipping tests (--skip-tests flag used)${NC}"
fi

# Update version in files
echo -e "${YELLOW}Updating version in project files...${NC}"

if [ "$DRY_RUN" = false ]; then
    # Update Cargo.toml
    if [ -f "backend/Cargo.toml" ]; then
        sed -i.bak "s/^version = .*/version = \"$VERSION\"/" backend/Cargo.toml
        rm -f backend/Cargo.toml.bak
        echo "Updated backend/Cargo.toml"
    fi
    
    # Update package.json
    if [ -f "frontend/package.json" ]; then
        sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" frontend/package.json
        rm -f frontend/package.json.bak
        echo "Updated frontend/package.json"
    fi
    
    # Update Chart.yaml
    if [ -f "k8s/mail2feed/Chart.yaml" ]; then
        sed -i.bak "s/version: .*/version: $VERSION/" k8s/mail2feed/Chart.yaml
        sed -i.bak "s/appVersion: .*/appVersion: \"$VERSION\"/" k8s/mail2feed/Chart.yaml
        rm -f k8s/mail2feed/Chart.yaml.bak
        echo "Updated k8s/mail2feed/Chart.yaml"
    fi
    
    echo -e "${GREEN}✓ Version updated in project files${NC}"
else
    echo "Would update:"
    echo "  backend/Cargo.toml version to $VERSION"
    echo "  frontend/package.json version to $VERSION"
    echo "  k8s/mail2feed/Chart.yaml version and appVersion to $VERSION"
fi

# Create release commit
echo -e "${YELLOW}Creating release commit...${NC}"

if [ "$DRY_RUN" = false ]; then
    git add .
    git commit -m "chore: bump version to $VERSION

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    
    echo -e "${GREEN}✓ Release commit created${NC}"
else
    echo "Would create commit: 'chore: bump version to $VERSION'"
fi

# Create and push tag
echo -e "${YELLOW}Creating release tag...${NC}"

if [ "$DRY_RUN" = false ]; then
    git tag -a "$TAG" -m "Release $TAG

This release includes:
- Backend version $VERSION
- Frontend version $VERSION
- Helm chart version $VERSION

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    
    echo -e "${GREEN}✓ Tag $TAG created${NC}"
else
    echo "Would create tag: $TAG"
fi

# Push changes
echo -e "${YELLOW}Pushing changes...${NC}"

if [ "$DRY_RUN" = false ]; then
    git push origin "$BRANCH"
    git push origin "$TAG"
    
    echo -e "${GREEN}✓ Changes and tag pushed to remote${NC}"
else
    echo "Would push:"
    echo "  git push origin $BRANCH"
    echo "  git push origin $TAG"
fi

echo ""
if [ "$DRY_RUN" = false ]; then
    echo -e "${GREEN}🎉 Release $VERSION created successfully!${NC}"
    echo ""
    echo "The GitHub Actions workflow will now:"
    echo "  1. Build and push container images"
    echo "  2. Package and publish Helm chart"
    echo "  3. Create GitHub release with release notes"
    echo ""
    echo "Monitor the release at:"
    echo "  https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/.]*\/[^/.]*\).*/\1/')/actions"
    echo "  https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/.]*\/[^/.]*\).*/\1/')/releases"
else
    echo -e "${BLUE}Dry run completed successfully!${NC}"
    echo ""
    echo "To create the release, run:"
    echo "  $0 $VERSION"
fi