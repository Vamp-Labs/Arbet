.PHONY: help up down logs logs-backend logs-frontend build rebuild test test-watch health clean deploy-local deploy-devnet

# Default target
.DEFAULT_GOAL := help

# Colors
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m

help: ## Show this help message
	@echo "$(BLUE)Arbet Development Commands$(NC)"
	@echo ""
	@echo "$(BLUE)Infrastructure:$(NC)"
	@echo "  $(GREEN)make up$(NC)                   Start all services"
	@echo "  $(GREEN)make down$(NC)                 Stop all services"
	@echo "  $(GREEN)make build$(NC)                Build Docker images"
	@echo "  $(GREEN)make rebuild$(NC)              Rebuild Docker images (no cache)"
	@echo "  $(GREEN)make logs$(NC)                 View logs from all services"
	@echo "  $(GREEN)make logs-backend$(NC)         View backend logs only"
	@echo "  $(GREEN)make logs-frontend$(NC)        View frontend logs only"
	@echo "  $(GREEN)make health$(NC)               Run health checks"
	@echo "  $(GREEN)make deploy-local$(NC)         Complete local deployment"
	@echo ""
	@echo "$(BLUE)Testing:$(NC)"
	@echo "  $(GREEN)make test$(NC)                 Run all tests"
	@echo "  $(GREEN)make test-backend$(NC)         Run backend tests"
	@echo "  $(GREEN)make test-frontend$(NC)        Run frontend tests"
	@echo "  $(GREEN)make test-watch$(NC)           Run tests in watch mode"
	@echo ""
	@echo "$(BLUE)Database:$(NC)"
	@echo "  $(GREEN)make db-shell$(NC)             Connect to database"
	@echo "  $(GREEN)make db-reset$(NC)             Reset database (careful!)"
	@echo ""
	@echo "$(BLUE)Deployment:$(NC)"
	@echo "  $(GREEN)make deploy-devnet$(NC)        Deploy to Devnet"
	@echo ""
	@echo "$(BLUE)Cleanup:$(NC)"
	@echo "  $(GREEN)make clean$(NC)                Clean up containers and volumes"
	@echo "  $(GREEN)make prune$(NC)                Deep clean (removes all docker artifacts)"

# Infrastructure commands
up: ## Start all Docker services
	@echo "$(BLUE)Starting all services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services started$(NC)"

down: ## Stop all Docker services
	@echo "$(BLUE)Stopping all services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

build: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build
	@echo "$(GREEN)✓ Build complete$(NC)"

rebuild: ## Rebuild Docker images (no cache)
	@echo "$(BLUE)Rebuilding Docker images (no cache)...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✓ Rebuild complete$(NC)"

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

# Testing commands
test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	cd backend && python -m pytest tests/ -v
	@echo "$(GREEN)✓ All tests passed$(NC)"

test-backend: ## Run backend tests
	@echo "$(BLUE)Running backend tests...$(NC)"
	cd backend && python -m pytest tests/ -v
	@echo "$(GREEN)✓ Backend tests passed$(NC)"

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	cd backend && python -m pytest tests/ -v --tb=short

health: ## Run health checks
	@echo "$(BLUE)Running health checks...$(NC)"
	bash scripts/health-check.sh

deploy-local: ## Complete local deployment
	@echo "$(BLUE)Running local deployment...$(NC)"
	bash scripts/deploy-local.sh

# Database commands
db-shell: ## Connect to PostgreSQL database
	@echo "$(BLUE)Connecting to database...$(NC)"
	docker-compose exec postgres psql -U arbet -d arbet_local

db-reset: ## Reset database (careful!)
	@echo "$(RED)WARNING: This will delete all data in the database!$(NC)"
	@echo "$(BLUE)Resetting database...$(NC)"
	docker-compose down -v
	docker-compose up -d postgres
	sleep 5
	@echo "$(GREEN)✓ Database reset$(NC)"

# Deployment commands
deploy-devnet: ## Deploy to Solana Devnet
	@echo "$(BLUE)Deploying to Devnet...$(NC)"
	bash scripts/deploy-devnet.sh

# Cleanup commands
clean: ## Stop services and remove containers
	@echo "$(BLUE)Cleaning up...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

prune: ## Deep clean - remove all Docker artifacts
	@echo "$(BLUE)Pruning Docker...$(NC)"
	docker system prune -a --volumes
	@echo "$(GREEN)✓ Prune complete$(NC)"
