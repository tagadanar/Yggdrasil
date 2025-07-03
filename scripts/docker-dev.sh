#!/bin/bash

# Docker Development Environment Management Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Generate SSL certificates if they don't exist
setup_ssl() {
    if [ ! -f "nginx/ssl/nginx.crt" ]; then
        print_status "Generating SSL certificates..."
        ./scripts/generate-ssl.sh
        print_success "SSL certificates generated"
    fi
}

# Build all images
build() {
    print_status "Building Docker images..."
    docker-compose build --parallel
    print_success "All images built successfully"
}

# Start development environment
start() {
    check_docker
    setup_ssl
    
    print_status "Starting 101 School Platform development environment..."
    docker-compose up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    print_status "Checking service health..."
    docker-compose ps
    
    print_success "Development environment started successfully!"
    print_status "Available services:"
    echo "  - Frontend: http://localhost:3100"
    echo "  - API Gateway: http://localhost:3000"
    echo "  - MongoDB: localhost:27017"
    echo "  - Redis: localhost:6379"
    echo "  - MailHog: http://localhost:8025"
    echo "  - Nginx (with SSL): https://localhost"
}

# Stop development environment
stop() {
    print_status "Stopping 101 School Platform development environment..."
    docker-compose down
    print_success "Development environment stopped"
}

# Restart development environment
restart() {
    stop
    start
}

# View logs
logs() {
    if [ -n "$2" ]; then
        docker-compose logs -f "$2"
    else
        docker-compose logs -f
    fi
}

# Clean up everything
clean() {
    print_warning "This will remove all containers, images, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up Docker resources..."
        docker-compose down -v --rmi all --remove-orphans
        docker system prune -f
        print_success "Clean up completed"
    else
        print_status "Clean up cancelled"
    fi
}

# Show status
status() {
    print_status "Service status:"
    docker-compose ps
    
    print_status "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

# Run tests in containers
test() {
    print_status "Running tests in development environment..."
    
    # Test each service
    services=("auth-service" "user-service" "course-service" "planning-service" "news-service" "statistics-service" "notification-service" "api-gateway")
    
    for service in "${services[@]}"; do
        print_status "Testing $service..."
        docker-compose exec "$service" npm test || print_warning "Tests failed for $service"
    done
    
    print_success "Test execution completed"
}

# Database operations
db_reset() {
    print_warning "This will reset the database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Resetting database..."
        docker-compose exec mongodb mongo --eval "db.dropDatabase()" school_platform
        docker-compose restart mongodb
        sleep 5
        print_success "Database reset completed"
    else
        print_status "Database reset cancelled"
    fi
}

# Show help
show_help() {
    echo "101 School Platform Docker Development Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  build       Build all Docker images"
    echo "  start       Start the development environment"
    echo "  stop        Stop the development environment"
    echo "  restart     Restart the development environment"
    echo "  logs        View logs (optional: specify service name)"
    echo "  status      Show service status and resource usage"
    echo "  test        Run tests in all services"
    echo "  clean       Clean up all Docker resources"
    echo "  db-reset    Reset the database"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start all services"
    echo "  $0 logs auth-service        # View auth service logs"
    echo "  $0 status                   # Show service status"
}

# Main script logic
case "$1" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$@"
        ;;
    status)
        status
        ;;
    test)
        test
        ;;
    clean)
        clean
        ;;
    db-reset)
        db_reset
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac