# Arbet Infrastructure Exploration Report
**Date:** April 14, 2026  
**Status:** Comprehensive analysis of current infrastructure setup

---

## 📋 Executive Summary

The Arbet project is a fully developed **Solana-based prediction market arbitrage system** with three core components:

| Component | Status | Framework | Deployment |
|-----------|--------|-----------|------------|
| **Smart Contracts** | ✅ Complete | Anchor/Rust (v0.30) | Manual (scripts) |
| **Backend API** | ✅ Complete | FastAPI + LangGraph | Manual (Makefile/shell) |
| **Frontend Dashboard** | ✅ Complete | Next.js 15 + React 18 | Manual (Makefile/npm) |
| **Docker Support** | ❌ Missing | N/A | **NEEDS CREATION** |
| **CI/CD Workflows** | ✅ Partial | GitHub Actions | **NEEDS ENHANCEMENT** |
| **Environment Config** | ✅ Example | .env.example | .env missing |

---

## 1️⃣ ENVIRONMENT CONFIGURATION

### Current State
```
📁 Project Root/
├── ✅ .env.example          (965 bytes - fully documented)
└── ❌ .env                  (MISSING - not in git)
```

### .env.example Configuration
**Location:** `/home/cn/projects/competition/web3/Arbet/.env.example`

#### Solana Configuration
```ini
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
PROGRAM_ID=your_program_id_here
```

#### Third-Party APIs
- **Helius (Solana RPC enhancer):** `HELIUS_API_KEY`
- **Alchemy (Blockchain data):** `ALCHEMY_API_KEY=B3ZR8idizuxRWbEmxLKrkx9XhM57T_BM`
- **Jito (MEV/bundle services):** `JITO_API_URL`, `JITO_AUTH_TOKEN`
- **Ollama (Local LLM):** `OLLAMA_HOST=http://localhost:11434`, `OLLAMA_MODEL=qwen:3b`
- **Market APIs:**
  - Capitola: `CAPITOLA_API_URL`, `CAPITOLA_API_KEY`
  - Polymarket: `POLYMARKET_API_URL`
  - Hedgehog: `HEDGEHOG_API_URL`

#### Frontend Configuration
```ini
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend Configuration
```ini
API_PORT=8000
DATABASE_URL=sqlite:///./arbet.db
CORS_ORIGINS=http://localhost:3000,https://arbet-agents.vercel.app
LOG_LEVEL=INFO
```

### Critical Infrastructure Gaps
| Item | Status | Notes |
|------|--------|-------|
| `.env` file | ❌ Missing | Create from .env.example for local dev |
| Production secrets | ⚠️ None | .env.example has dummy keys (Alchemy key visible) |
| Environment isolation | ⚠️ Weak | Only NEXT_PUBLIC_* separation exists |
| Secrets management | ❌ None | No HashiCorp Vault, AWS Secrets Manager, etc. |

---

## 2️⃣ DOCKER SETUP

### Current State
```
❌ NO DOCKER FILES FOUND
```

The project currently has **no Docker or docker-compose configuration**. All components require manual installation and startup.

### Existing Manual Startup (from Makefile)
```bash
# Backend on port 8000
(cd backend && python -m uvicorn backend.api.server:app --reload)

# Frontend on port 3000
(cd web && npm run dev)

# Smart contracts require Anchor locally installed
cd contracts && anchor build && anchor deploy --provider.cluster devnet
```

### Missing Docker Infrastructure
| Component | Need | Priority |
|-----------|------|----------|
| **Backend Dockerfile** | FastAPI + Python 3.12 | 🔴 High |
| **Frontend Dockerfile** | Node 18 + Next.js | 🔴 High |
| **Docker Compose** | Multi-container orchestration | 🔴 High |
| **Volumes** | Persistent SQLite DB, node_modules caching | 🟡 Medium |
| **Health Checks** | Container readiness probes | 🟡 Medium |
| **Networking** | Inter-container communication | 🔴 High |
| **Environment files** | Docker-specific .env setup | 🔴 High |
| **Development setup** | Hot-reload support | 🟡 Medium |

---

## 3️⃣ GITHUB ACTIONS WORKFLOWS

### Current Workflows
**Location:** `.github/workflows/`

#### 1. Smart Contract Tests & Build
**File:** `test-contracts.yml`
```yaml
Trigger: [push, pull_request]
Runner: ubuntu-latest
Rust: 1.85.0

Steps:
  1. Checkout code
  2. Install Rust toolchain
  3. Install Anchor v1.0.0
  4. anchor build
  5. cargo test --lib
  6. cargo clippy (strict warnings)
```

#### 2. Backend Tests & Lint
**File:** `test-backend.yml`
```yaml
Trigger: [push, pull_request]
Runner: ubuntu-latest
Python: 3.12

Steps:
  1. Checkout code
  2. Install Python 3.12
  3. pip install -r requirements.txt
  4. pytest tests/ -v
  5. pylint (with lenient config)
  6. mypy (optional type checking)
```

#### 3. Frontend Tests & Build
**File:** `test-frontend.yml`
```yaml
Trigger: [push, pull_request]
Runner: ubuntu-latest
Node: 18

Steps:
  1. Checkout code
  2. npm ci (install dependencies)
  3. npm run lint (with fallback)
  4. npm run type-check (optional)
  5. npm run build
  6. npm run test (optional)
```

### Current Workflow Issues
| Issue | Severity | Notes |
|-------|----------|-------|
| **No deployment workflows** | 🔴 High | No staging/prod deployment automation |
| **No Docker image builds** | 🔴 High | Can't push to Docker registries |
| **No integration tests** | 🔴 High | Only unit tests, no e2e |
| **Linting tolerance** | 🟡 Medium | `\|\| true` makes failures non-blocking |
| **No cache strategy** | 🟡 Medium | No npm/cargo caching for speed |
| **No secrets validation** | 🟡 Medium | Can't verify API keys work |

### Missing Workflows
```
❌ Deployment (staging/production)
❌ Docker image build & push
❌ Security scanning (Cargo audit, npm audit)
❌ Smart contract audit integration
❌ Performance benchmarking
❌ Release automation
```

---

## 4️⃣ PROJECT ROOT STRUCTURE

```
📦 /home/cn/projects/competition/web3/Arbet/
├── 📄 .env.example                    ✅ Environment template
├── 📄 .gitignore                      ✅ Git ignore rules
├── 📄 Anchor.toml                     ✅ Anchor config (devnet settings)
├── 📄 Makefile                        ✅ Development shortcuts
├── 🚀 scripts/
│   ├── deploy.sh                      ✅ Manual contract deployment
│   └── verify_deployment.sh           ✅ Deployment verification
├── 📄 Cargo.toml (root)               ✅ Rust workspace config
│   └── [profile: release/dev]         ✅ Optimization levels
├── 📚 docs/                           ✅ Documentation folder
├── 📋 CLE-*.md files                  ✅ Implementation specs
├── 📊 PROJECT_STATUS.md               ✅ Detailed status
└── ⚙️ CONFIGURATION: Missing
    ├── ❌ Dockerfile (backend)
    ├── ❌ Dockerfile (frontend)
    ├── ❌ docker-compose.yml
    ├── ❌ .env (create from example)
    └── ❌ .dockerignore files
```

### Key Files Found
| File | Size | Purpose |
|------|------|---------|
| `Makefile` | 1.9k | Dev command shortcuts (setup, build, test, dev, clean) |
| `Anchor.toml` | 320b | Anchor program config (devnet cluster) |
| `scripts/deploy.sh` | 1.5k | Devnet deployment script |
| `scripts/verify_deployment.sh` | 1.7k | Deployment verification |

---

## 5️⃣ BACKEND API CONFIGURATION

### Backend Structure
```
📁 /home/cn/projects/competition/web3/Arbet/backend/
├── 📄 requirements.txt                ✅ Python dependencies
├── 📄 pyproject.toml                  ✅ Project metadata
├── 📁 tests/                          ✅ Test suite
├── 📁 backend/
│   ├── 🔌 api/
│   │   ├── server.py                  ✅ FastAPI main app
│   │   └── service.py                 ✅ Business logic
│   ├── 🤖 agent/
│   │   ├── scout.py                   ✅ Price monitoring agent
│   │   ├── forecaster.py              ✅ Event forecasting agent
│   │   ├── executor.py                ✅ Trade execution agent
│   │   ├── coordinator.py             ✅ Risk management agent
│   │   ├── graph.py                   ✅ LangGraph orchestration
│   │   └── __init__.py
│   ├── 💾 db/
│   │   ├── models.py                  ✅ SQLAlchemy ORM models
│   │   ├── init.py                    ✅ DB initialization
│   │   └── rag.py                     ✅ RAG (semantic search)
│   ├── 🎯 models/
│   │   └── schemas.py                 ✅ Pydantic request/response
│   └── __init__.py
└── 📦 arbet.db                        ✅ SQLite database (57k)
```

### FastAPI Server Details
**Location:** `backend/backend/api/server.py`

**Startup Command:**
```bash
cd backend && python -m uvicorn backend.api.server:app --reload
# Runs on http://localhost:8000
```

#### Key Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Server health + agent metrics |
| `/opportunities` | GET | Recent arbitrage opportunities (sorted by spread) |
| `/trades` | GET | Trade history (filterable by vault, time) |
| `/vault/{vault_id}` | GET | Vault state (balance, PnL, drawdown) |
| `/vault/{vault_id}/create` | POST | Create new vault |
| `/agent-logs` | GET | Agent decision logs (with filtering) |
| `/ws/agent-state` | WS | WebSocket for real-time agent events |

#### Backend Dependencies
**File:** `requirements.txt`
```
FastAPI 0.104.1       - REST framework
uvicorn 0.24.0        - ASGI server
SQLAlchemy 2.0.23     - ORM
Pydantic 2.5.0        - Data validation
Solana 0.33.0         - Solana client
Solders 0.27.1        - Solana serialization
LangGraph 0.0.16      - Multi-agent orchestration
LangChain 0.1.0       - LLM framework
Ollama 0.1.0          - Local LLM client
pytest 7.4.3          - Testing
black, pylint, mypy   - Code quality
```

#### Environment Variables Required
- `SOLANA_RPC_URL` - Solana devnet RPC
- `HELIUS_API_KEY` - Helius API key
- `JITO_API_URL` - Jito bundle API
- `OLLAMA_HOST` - Local LLM endpoint
- `API_PORT` - Port (default 8000)
- `DATABASE_URL` - SQLite connection string
- `CORS_ORIGINS` - Allowed CORS domains

---

## 6️⃣ FRONTEND DEPLOYMENT CONFIGURATION

### Frontend Structure
```
📁 /home/cn/projects/competition/web3/Arbet/web/
├── 📄 package.json                    ✅ Node dependencies
├── 📄 next.config.js                  ✅ Next.js config
├── 📄 tsconfig.json                   ✅ TypeScript config
├── 📄 tailwind.config.js              ✅ Tailwind CSS config
├── 📄 jest.config.js                  ✅ Jest test config
├── 📁 app/
│   ├── page.tsx                       ✅ Main dashboard
│   ├── layout.tsx                     ✅ Layout wrapper
│   └── globals.css                    ✅ Global styles
├── 📁 components/                     ✅ React components
├── 📁 lib/                            ✅ Hooks and utilities
├── 📁 __tests__/                      ✅ Test suite
└── 📁 public/                         ✅ Static assets
```

### Frontend Startup Command
```bash
cd web && npm run dev
# Runs on http://localhost:3000
# Connects to backend at NEXT_PUBLIC_API_URL (default http://localhost:8000)
```

### Next.js Configuration
**File:** `next.config.js`
```javascript
{
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  env: {
    NEXT_PUBLIC_RPC_ENDPOINT,
    NEXT_PUBLIC_NETWORK,
    NEXT_PUBLIC_API_URL
  },
  typescript: {
    ignoreBuildErrors: true  // ⚠️ Production warning
  }
}
```

### Package Scripts
```json
"scripts": {
  "dev": "next dev",                    // Dev server on :3000
  "build": "next build",                // Production build
  "start": "next start",                // Start production server
  "lint": "next lint",                  // ESLint
  "test": "jest",                       // Jest tests
  "type-check": "tsc --noEmit"          // Type checking
}
```

### Frontend Dependencies
```json
Key Libraries:
  - next 15.0.0             - React framework
  - react 18.2.0
  - TypeScript 5.3.0
  - Tailwind CSS 3.4.1      - Styling
  - Zustand 4.4.1           - State management
  - @solana/web3.js 1.91.0  - Wallet connection
  - axios 1.6.2             - HTTP client
  - recharts 2.15.4         - Charts
  - React Hook Form 7.48.0  - Form handling
```

#### Environment Variables Required
- `NEXT_PUBLIC_RPC_ENDPOINT` - Solana RPC
- `NEXT_PUBLIC_NETWORK` - Network name (devnet/mainnet)
- `NEXT_PUBLIC_API_URL` - Backend API URL

---

## 7️⃣ SMART CONTRACT DEPLOYMENT SETUP

### Contract Structure
```
📁 /home/cn/projects/competition/web3/Arbet/contracts/
├── 📄 Cargo.toml                      ✅ Workspace config
├── 📁 programs/arbet/
│   ├── 📄 Cargo.toml                  ✅ Program dependencies
│   ├── 📁 src/                        ✅ Contract source code
│   └── [build artifacts]
├── 📁 target/                         ✅ Build artifacts
└── 📄 Cargo.lock                      ✅ Dependency lock
```

### Anchor Configuration
**File:** `Anchor.toml`
```toml
[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[programs.devnet]
arbet = "YOUR_PROGRAM_ID_HERE"         # ⚠️ Placeholder needs update

[registry]
url = "https://api.apr.dev"
```

### Contract Dependencies
**File:** `Cargo.toml`
```toml
anchor-lang = "0.30"      # Anchor framework
anchor-spl = "0.30"       # SPL program interfaces
```

### Deployment Scripts

**Script 1:** `scripts/deploy.sh`
- Checks prerequisites (Anchor, Solana CLI)
- Sets network to devnet
- Checks balance and airdrops if needed
- Builds with: `anchor build`
- Deploys with: `anchor deploy --provider.cluster devnet`
- Outputs PROGRAM_ID for Anchor.toml update

**Script 2:** `scripts/verify_deployment.sh`
- Verifies Solana CLI installed
- Verifies connected to devnet
- Extracts PROGRAM_ID from Anchor.toml
- Runs: `solana program show <PROGRAM_ID>`
- Checks wallet balance

---

## 📊 INFRASTRUCTURE GAP ANALYSIS

### Priority 1 - Critical (Must Have for Production)
| Gap | Impact | Effort | Status |
|-----|--------|--------|--------|
| **Docker containerization** | Cannot deploy to cloud | High | ❌ Missing |
| **Production .env setup** | Secrets exposure risk | Medium | ⚠️ Template only |
| **Deployment workflows** | Manual deployment errors | High | ❌ Missing |
| **Secrets management** | API keys hardcoded | High | ❌ Missing |
| **Health checks** | Unknown container status | Medium | ⚠️ Partial |
| **Persistent volumes** | Data loss on restart | Medium | ❌ Missing |

### Priority 2 - Important (Should Have)
| Gap | Impact | Effort | Status |
|-----|--------|--------|--------|
| **Docker image optimization** | Slow startup/large images | Medium | ❌ Missing |
| **Integration tests** | End-to-end quality unknown | High | ✅ Code ready |
| **Security scanning** | Unknown vulnerabilities | Medium | ❌ Missing |
| **Performance monitoring** | No metrics collection | High | ❌ Missing |
| **Database migrations** | Schema change management | Medium | ❌ Missing |

### Priority 3 - Nice to Have
| Gap | Impact | Effort | Status |
|-----|--------|--------|--------|
| **Multi-stage builds** | Image size optimization | Low | ❌ Missing |
| **Container registry** | Docker Hub/ECR push | Low | ❌ Missing |
| **Kubernetes manifests** | K8s deployment ready | High | ❌ Missing |
| **Observability stack** | Metrics/logs/traces | High | ❌ Missing |
| **Auto-scaling config** | Dynamic scaling setup | High | ❌ Missing |

---

## ✅ READY-TO-IMPLEMENT ITEMS

### Backend Ready
- ✅ Unified code structure
- ✅ All dependencies in requirements.txt
- ✅ API server with WebSocket
- ✅ Database models
- ✅ Agent orchestration
- ✅ Tests in place

**Needs:** Dockerfile, docker-compose service definition

### Frontend Ready
- ✅ Next.js configured
- ✅ All dependencies in package.json
- ✅ Build scripts ready
- ✅ Environment variables templated
- ✅ Tests in place

**Needs:** Dockerfile, docker-compose service definition, nginx config for production

### Smart Contracts Ready
- ✅ Anchor program compiled
- ✅ Deploy scripts created
- ✅ Tests passing
- ✅ Network config in Anchor.toml

**Needs:** No Docker (CLI-only), CI/CD for deployment

---

## 🎯 CONCLUSION

**The Arbet project is well-structured and feature-complete from a development standpoint**, but **lacks production-grade infrastructure**:

### Strengths ✅
- Three fully implemented components (frontend, backend, contracts)
- Comprehensive API with WebSocket support
- Multi-agent orchestration system
- Proper code structure and dependencies
- GitHub Actions CI for testing
- Clear deployment scripts for contracts

### Weaknesses ❌
- No Docker containerization
- No automated deployment workflows
- Missing secrets management
- No production deployment targets
- .env not in git (no local setup guide)
- Limited CI/CD automation
- No observability/monitoring setup

### Recommendation
**Implement Docker setup first** to enable:
1. Local development with `docker-compose up`
2. CI/CD image builds and pushes
3. Easy cloud deployment
4. Consistent environments across dev/staging/prod
5. Zero-dependency onboarding (just Docker required)

This would be a **2-3 day effort** with significant long-term payoff in deployment velocity and reliability.

---

**Report Generated:** April 14, 2026  
**Analysis Scope:** Complete infrastructure audit  
**Status:** Ready for implementation planning
