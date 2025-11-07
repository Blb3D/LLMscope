#!/bin/bash

# LLMscope Demo Quick Start Script
# This script automates the setup and startup of LLMscope for demo purposes

set -e  # Exit on error

echo "=========================================="
echo "   LLMscope Demo Deployment Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Step 1: Check if Docker is installed
echo "Step 1: Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi
print_success "Docker is installed"

# Step 2: Check if Docker is running
echo ""
echo "Step 2: Checking if Docker is running..."
if ! docker info &> /dev/null; then
    print_error "Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi
print_success "Docker is running"

# Step 3: Check if docker-compose is available
echo ""
echo "Step 3: Checking Docker Compose..."
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available!"
    echo "Please ensure you have Docker Compose installed."
    exit 1
fi
print_success "Docker Compose is available"

# Step 4: Create data directory if it doesn't exist
echo ""
echo "Step 4: Setting up data directory..."
if [ ! -d "data" ]; then
    mkdir -p data
    print_success "Created data directory"
else
    print_success "Data directory already exists"
fi

# Step 5: Check if ports are available
echo ""
echo "Step 5: Checking if required ports are available..."

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 1
    else
        return 0
    fi
}

if ! check_port 8000; then
    print_error "Port 8000 is already in use!"
    echo "Please free up port 8000 or modify docker-compose.yml"
    exit 1
fi
print_success "Port 8000 is available"

if ! check_port 8081; then
    print_error "Port 8081 is already in use!"
    echo "Please free up port 8081 or modify docker-compose.yml"
    exit 1
fi
print_success "Port 8081 is available"

# Step 6: Stop any existing containers
echo ""
echo "Step 6: Stopping any existing LLMscope containers..."
docker compose down &> /dev/null || true
print_success "Cleaned up existing containers"

# Step 7: Build and start containers
echo ""
echo "Step 7: Building and starting Docker containers..."
echo "(This may take a few minutes on first run)"
echo ""

if docker compose up -d --build; then
    print_success "Containers started successfully"
else
    print_error "Failed to start containers"
    echo ""
    echo "Showing logs for debugging:"
    docker compose logs
    exit 1
fi

# Step 8: Wait for services to be healthy
echo ""
echo "Step 8: Waiting for services to be ready..."
echo "(This may take 30-60 seconds)"

MAX_WAIT=60
COUNTER=0

while [ $COUNTER -lt $MAX_WAIT ]; do
    if curl -f http://localhost:8000/ &> /dev/null; then
        print_success "Backend is ready!"
        break
    fi
    echo -n "."
    sleep 2
    COUNTER=$((COUNTER + 2))
done

if [ $COUNTER -ge $MAX_WAIT ]; then
    print_error "Backend failed to start within ${MAX_WAIT} seconds"
    echo ""
    echo "Backend logs:"
    docker logs llmscope_backend
    exit 1
fi

# Wait a bit more for frontend
sleep 3

# Step 9: Generate demo data (optional)
echo ""
echo "Step 9: Generate demo data? (y/n)"
read -p "Generate demo data: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Generating demo data..."
    if docker exec llmscope_backend python generate_demo_data.py; then
        print_success "Demo data generated successfully"
    else
        print_error "Failed to generate demo data (you can run this manually later)"
    fi
fi

# Step 10: Display success message
echo ""
echo "=========================================="
echo "   🎉 LLMscope Demo is Ready!"
echo "=========================================="
echo ""
print_success "Dashboard: http://localhost:8081"
print_success "Backend API: http://localhost:8000"
print_success "API Docs: http://localhost:8000/docs"
echo ""
echo "Useful commands:"
echo "  • View logs:          docker compose logs -f"
echo "  • Stop services:      docker compose down"
echo "  • Restart services:   docker compose restart"
echo "  • Generate demo data: docker exec llmscope_backend python generate_demo_data.py"
echo ""
echo "Troubleshooting guide: See DOCKER_TROUBLESHOOTING.md"
echo ""
print_info "Opening dashboard in your browser..."

# Try to open browser (works on most systems)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8081 &> /dev/null || true
elif command -v open &> /dev/null; then
    open http://localhost:8081 &> /dev/null || true
fi

echo "=========================================="
