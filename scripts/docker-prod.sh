#!/bin/bash

# Docker Production Deployment Script

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

# Check if required environment variables are set
check_env() {
    required_vars=("MONGODB_URI" "REDIS_URL" "JWT_SECRET" "NEXTAUTH_SECRET")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    print_success "All required environment variables are set"
}

# Check if Docker Swarm is initialized
check_swarm() {
    if ! docker node ls > /dev/null 2>&1; then
        print_error "Docker Swarm is not initialized. Run 'docker swarm init' first."
        exit 1
    fi
    print_success "Docker Swarm is ready"
}

# Create Docker secrets
create_secrets() {
    print_status "Creating Docker secrets..."
    
    # Create secrets if they don't exist
    if ! docker secret ls | grep -q jwt_secret; then
        echo "$JWT_SECRET" | docker secret create jwt_secret -
        print_success "Created jwt_secret"
    fi
    
    if ! docker secret ls | grep -q mongodb_uri; then
        echo "$MONGODB_URI" | docker secret create mongodb_uri -
        print_success "Created mongodb_uri"
    fi
    
    if ! docker secret ls | grep -q redis_url; then
        echo "$REDIS_URL" | docker secret create redis_url -
        print_success "Created redis_url"
    fi
}

# Build and push images to registry
build_and_push() {
    if [ -z "$DOCKER_REGISTRY" ]; then
        print_error "DOCKER_REGISTRY environment variable is not set"
        exit 1
    fi
    
    print_status "Building and pushing production images..."
    
    services=("api-gateway" "auth-service" "user-service" "course-service" "planning-service" "news-service" "statistics-service" "notification-service" "frontend")
    
    for service in "${services[@]}"; do
        print_status "Building $service..."
        docker build -t "$DOCKER_REGISTRY/101school-$service:latest" -f "packages/*/Dockerfile" .
        
        print_status "Pushing $service..."
        docker push "$DOCKER_REGISTRY/101school-$service:latest"
    done
    
    print_success "All images built and pushed successfully"
}

# Deploy to production
deploy() {
    check_env
    check_swarm
    create_secrets
    
    print_status "Deploying 101 School Platform to production..."
    
    # Deploy the stack
    docker stack deploy -c docker-compose.prod.yml school-platform
    
    print_status "Waiting for services to start..."
    sleep 30
    
    # Check deployment status
    print_status "Deployment status:"
    docker stack services school-platform
    
    print_success "Production deployment completed!"
}

# Update production deployment
update() {
    print_status "Updating production deployment..."
    
    # Update images
    docker stack deploy -c docker-compose.prod.yml school-platform
    
    print_status "Rolling update initiated. Checking status..."
    docker stack services school-platform
    
    print_success "Update completed!"
}

# Scale services
scale() {
    if [ -z "$2" ] || [ -z "$3" ]; then
        print_error "Usage: $0 scale <service> <replicas>"
        exit 1
    fi
    
    service_name="school-platform_$2"
    replicas="$3"
    
    print_status "Scaling $service_name to $replicas replicas..."
    docker service scale "$service_name=$replicas"
    
    print_success "Service scaled successfully"
}

# View logs
logs() {
    if [ -z "$2" ]; then
        print_error "Usage: $0 logs <service>"
        exit 1
    fi
    
    service_name="school-platform_$2"
    docker service logs -f "$service_name"
}

# Show status
status() {
    print_status "Stack status:"
    docker stack ps school-platform
    
    print_status "Service status:"
    docker stack services school-platform
    
    print_status "Network status:"
    docker network ls | grep school-platform
}

# Health check
health() {
    print_status "Performing health checks..."
    
    services=("api-gateway" "auth-service" "user-service" "course-service" "planning-service" "news-service" "statistics-service" "notification-service" "frontend")
    
    for service in "${services[@]}"; do
        service_name="school-platform_$service"
        
        # Get service status
        status=$(docker service ps "$service_name" --format "table {{.CurrentState}}" | tail -n +2 | head -1)
        
        if [[ "$status" == *"Running"* ]]; then
            print_success "$service is healthy"
        else
            print_warning "$service status: $status"
        fi
    done
}

# Rollback deployment
rollback() {
    print_warning "This will rollback the deployment. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Rolling back deployment..."
        docker stack deploy --resolve-image never -c docker-compose.prod.yml school-platform
        print_success "Rollback completed"
    else
        print_status "Rollback cancelled"
    fi
}

# Remove production deployment
remove() {
    print_warning "This will remove the entire production stack. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Removing production stack..."
        docker stack rm school-platform
        print_success "Production stack removed"
    else
        print_status "Removal cancelled"
    fi
}

# Show help
show_help() {
    echo "101 School Platform Docker Production Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  deploy      Deploy to production"
    echo "  update      Update production deployment"
    echo "  scale       Scale a service (usage: scale <service> <replicas>)"
    echo "  logs        View service logs (usage: logs <service>)"
    echo "  status      Show deployment status"
    echo "  health      Perform health checks"
    echo "  rollback    Rollback deployment"
    echo "  remove      Remove production stack"
    echo "  build       Build and push images to registry"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  MONGODB_URI     - MongoDB connection string"
    echo "  REDIS_URL       - Redis connection string"
    echo "  JWT_SECRET      - JWT signing secret"
    echo "  NEXTAUTH_SECRET - NextAuth secret"
    echo "  DOCKER_REGISTRY - Docker registry URL (for build command)"
    echo ""
    echo "Examples:"
    echo "  $0 deploy                          # Deploy to production"
    echo "  $0 scale auth-service 3            # Scale auth service to 3 replicas"
    echo "  $0 logs api-gateway                # View API gateway logs"
    echo "  $0 health                          # Check service health"
}

# Main script logic
case "$1" in
    deploy)
        deploy
        ;;
    update)
        update
        ;;
    scale)
        scale "$@"
        ;;
    logs)
        logs "$@"
        ;;
    status)
        status
        ;;
    health)
        health
        ;;
    rollback)
        rollback
        ;;
    remove)
        remove
        ;;
    build)
        build_and_push
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