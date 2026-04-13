.setup
	@echo "🚀 Installing dependencies..."
	@echo "📦 Installing Anchor (v1.0.0)..."
	avm install 1.0.0 && avm use 1.0.0
	@echo "📦 Installing Node dependencies..."
	cd web && npm ci && cd ..
	@echo "📦 Installing Python dependencies..."
	cd backend && pip install -r requirements.txt && cd ..
	@echo "📦 Installing Rust dependencies..."
	cd contracts && cargo fetch && cd ..
	@echo "✅ Setup complete!"

.build
	@echo "🔨 Building all components..."
	cd contracts && anchor build && cd ..
	cd web && npm run build && cd ..
	cd backend && python -m py_compile backend/agent/*.py && cd ..
	@echo "✅ Build complete!"

.test
	@echo "🧪 Running all tests..."
	cd contracts && cargo test --lib && cd ..
	cd web && npm run test && cd ..
	cd backend && pytest tests/ && cd ..
	@echo "✅ Tests passed!"

.lint
	@echo "📝 Linting code..."
	cd contracts && cargo clippy && cd ..
	cd web && npm run lint && cd ..
	cd backend && pylint backend/ && cd ..
	@echo "✅ Linting complete!"

.dev
	@echo "👀 Starting dev servers..."
	@echo "Backend on :8000, Frontend on :3000"
	(cd backend && python -m uvicorn backend.api.server:app --reload) &
	(cd web && npm run dev) &
	@echo "📖 Docs available at ./docs/"

.clean
	@echo "🧹 Cleaning build artifacts..."
	rm -rf target/ dist/ .next/ __pycache__/ htmlcov/ coverage/
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	@echo "✅ Clean complete!"

.help
	@echo "Arbet Agents - Makefile Commands"
	@echo "=================================="
	@echo "make setup    - Install all dependencies"
	@echo "make build    - Build all components"
	@echo "make test     - Run all tests"
	@echo "make lint     - Lint all code"
	@echo "make dev      - Start development servers"
	@echo "make clean    - Clean build artifacts"
	@echo "make help     - Show this help message"

.PHONY: setup build test lint dev clean help
