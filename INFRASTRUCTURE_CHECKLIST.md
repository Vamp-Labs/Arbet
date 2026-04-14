# Arbet Infrastructure - Implementation Checklist

**Created:** April 14, 2026  
**Status:** Ready for implementation  
**Priority:** Complete Docker setup first (Phase 1)

---

## 📋 PHASE 1: DOCKER CONTAINERIZATION (2-3 Days)

### Backend Dockerfile
- [ ] Create `backend/Dockerfile`
  - [ ] Base image: `python:3.12-slim`
  - [ ] Workdir: `/app`
  - [ ] Copy `requirements.txt`
  - [ ] Install dependencies: `pip install -r requirements.txt`
  - [ ] Copy source code
  - [ ] Expose port 8000
  - [ ] Health check: `curl -f http://localhost:8000/health`
  - [ ] CMD: `uvicorn backend.api.server:app --host 0.0.0.0 --port 8000`
- [ ] Create `backend/.dockerignore`
  - [ ] Add: `__pycache__`, `*.pyc`, `.pytest_cache`, `venv`, `.env`

### Frontend Dockerfile
- [ ] Create `web/Dockerfile` (multi-stage)
  - [ ] Build stage: `node:18-alpine`
    - [ ] Workdir: `/app`
    - [ ] Copy `package*.json`
    - [ ] Install: `npm ci`
    - [ ] Copy source
    - [ ] Build: `npm run build`
  - [ ] Runtime stage: `node:18-alpine`
    - [ ] Copy `node_modules` from build
    - [ ] Copy `.next` from build
    - [ ] Copy `public`
    - [ ] Expose port 3000
    - [ ] Health check: `curl -f http://localhost:3000/`
    - [ ] CMD: `npm start`
- [ ] Create `web/.dockerignore`
  - [ ] Add: `node_modules`, `.next`, `.git`, `.env`

### Docker Compose
- [ ] Create `docker-compose.yml` in project root
  - [ ] Service: `backend`
    - [ ] Image: `arbet-backend:latest`
    - [ ] Build context: `./backend`
    - [ ] Ports: `8000:8000`
    - [ ] Environment: Load from `.env`
    - [ ] Volumes: `./backend/arbet.db:/app/arbet.db` (persist SQLite)
    - [ ] Health check: `interval: 10s, timeout: 5s, retries: 3`
    - [ ] Depends on: None initially
  - [ ] Service: `frontend`
    - [ ] Image: `arbet-frontend:latest`
    - [ ] Build context: `./web`
    - [ ] Ports: `3000:3000`
    - [ ] Environment: Load from `.env`
    - [ ] Depends on: `backend`
    - [ ] Health check: `interval: 10s, timeout: 5s, retries: 3`
  - [ ] Networks: Create `arbet-network` bridge
  - [ ] Volumes: Define `sqlite-data` volume

### Environment Files
- [ ] Create `.env` from `.env.example`
  - [ ] Fill in dummy values for local development
  - [ ] Add to `.gitignore` (never commit)
- [ ] Create `.env.production` for production
  - [ ] Fill in production values
  - [ ] Store securely (not in git)
- [ ] Create `.env.docker` for Docker-specific overrides
  - [ ] Set `NEXT_PUBLIC_API_URL=http://backend:8000`
  - [ ] Set `OLLAMA_HOST=http://ollama:11434` (if using container)

### Local Testing
- [ ] Test backend Dockerfile
  - [ ] `docker build -t arbet-backend:latest ./backend`
  - [ ] `docker run -p 8000:8000 arbet-backend:latest`
  - [ ] Verify: `curl http://localhost:8000/health`
- [ ] Test frontend Dockerfile
  - [ ] `docker build -t arbet-frontend:latest ./web`
  - [ ] `docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:8000 arbet-frontend:latest`
  - [ ] Verify: `curl http://localhost:3000/`
- [ ] Test docker-compose
  - [ ] `docker-compose up` from project root
  - [ ] Verify backend at http://localhost:8000/health
  - [ ] Verify frontend at http://localhost:3000
  - [ ] Check inter-container communication
  - [ ] `docker-compose down`

### Documentation
- [ ] Create `DOCKER.md` with:
  - [ ] Prerequisites (Docker, Docker Compose versions)
  - [ ] Quick start: `docker-compose up`
  - [ ] Building images individually
  - [ ] Environment variables guide
  - [ ] Troubleshooting common issues
  - [ ] Development workflow with hot-reload
  - [ ] Production deployment notes
- [ ] Update `README.md` with Docker quick start
- [ ] Update `Makefile` with Docker targets:
  - [ ] `make docker-build` - Build all images
  - [ ] `make docker-up` - Start services
  - [ ] `make docker-down` - Stop services
  - [ ] `make docker-logs` - View logs

---

## 📋 PHASE 2: ENVIRONMENT & SECRETS (1 Day)

### Local Environment Setup
- [ ] Document `.env` creation process
  - [ ] Copy `.env.example` to `.env`
  - [ ] List all required variables
  - [ ] Indicate which need real values vs. defaults
  - [ ] Warn about API key visibility
- [ ] Create setup script: `scripts/setup-env.sh`
  - [ ] Check if `.env` exists
  - [ ] Copy from `.env.example` if missing
  - [ ] Validate required variables
  - [ ] Print missing variables needing values

### GitHub Secrets
- [ ] Identify all secret variables:
  - [ ] `HELIUS_API_KEY`
  - [ ] `ALCHEMY_API_KEY` (visible in .env.example - replace)
  - [ ] `JITO_AUTH_TOKEN`
  - [ ] `CAPITOLA_API_KEY`
  - [ ] Any other private keys/tokens
- [ ] Document in SECRETS.md:
  - [ ] Where to find each secret
  - [ ] How to add to GitHub
  - [ ] Which workflows need which secrets
- [ ] Add to GitHub Settings > Secrets and Variables > Actions:
  - [ ] Each secret as `GH_SECRET_<NAME>`

### Production Environment
- [ ] Create `.env.production` template
  - [ ] Mark required production values
  - [ ] Add production endpoints
  - [ ] Increase security/validation levels
- [ ] Document production environment
  - [ ] Which variables are needed
  - [ ] Recommended cloud provider setups
  - [ ] Secrets manager integration (AWS Secrets Manager, HashiCorp Vault)

### Security Audit
- [ ] Scan `.env.example` for exposed keys
  - [ ] Replace Alchemy API key with placeholder
  - [ ] Ensure all dummy values are clearly marked
- [ ] Add pre-commit hook
  - [ ] Prevent `.env` files from being committed
  - [ ] Warn if environment variables are hardcoded

---

## 📋 PHASE 3: CI/CD ENHANCEMENT (2 Days)

### Docker Image Build & Push
- [ ] Create `.github/workflows/build-and-push.yml`
  - [ ] Trigger: `on: [push, pull_request, workflow_dispatch]`
  - [ ] Jobs:
    - [ ] `build-backend`
      - [ ] Build backend image
      - [ ] Run tests inside container
      - [ ] Push to registry (if main branch)
    - [ ] `build-frontend`
      - [ ] Build frontend image
      - [ ] Run build verification
      - [ ] Push to registry (if main branch)
  - [ ] Secrets used: Registry credentials, API keys for testing
- [ ] Setup Docker registry
  - [ ] Choose: Docker Hub, GitHub Container Registry, or AWS ECR
  - [ ] Create registry credentials
  - [ ] Add to GitHub Secrets: `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`

### Integration Tests
- [ ] Create `.github/workflows/integration-tests.yml`
  - [ ] Trigger: `on: [push, pull_request]`
  - [ ] Service: Start `docker-compose up` in test mode
  - [ ] Tests:
    - [ ] Backend health check
    - [ ] Frontend build verification
    - [ ] API endpoint tests
    - [ ] WebSocket connection test
  - [ ] Cleanup: `docker-compose down`

### Security Scanning
- [ ] Add cargo audit for smart contracts
  - [ ] Run: `cargo audit` in contracts workflow
  - [ ] Fail if vulnerabilities found
- [ ] Add npm audit for frontend
  - [ ] Run: `npm audit` in frontend workflow
  - [ ] Report but don't fail (unless critical)
- [ ] Add pip audit for backend
  - [ ] Run: `pip install pip-audit && pip-audit`
  - [ ] Report vulnerabilities

### Performance & Caching
- [ ] Add GitHub Actions caching
  - [ ] Cache npm dependencies
  - [ ] Cache cargo dependencies
  - [ ] Cache Python pip cache
  - [ ] Cache Docker layers (buildx cache)
- [ ] Measure workflow performance
  - [ ] Target: <5 min for all tests

### Deployment Workflows
- [ ] Create `.github/workflows/deploy-staging.yml`
  - [ ] Trigger: Manual dispatch + push to `develop` branch
  - [ ] Steps:
    - [ ] Build Docker images
    - [ ] Push to staging registry
    - [ ] Deploy to staging environment
    - [ ] Run smoke tests
    - [ ] Notify Slack/email
- [ ] Create `.github/workflows/deploy-production.yml`
  - [ ] Trigger: Manual dispatch only (release tags)
  - [ ] Steps:
    - [ ] Build Docker images
    - [ ] Run full test suite
    - [ ] Push to production registry
    - [ ] Create GitHub release
    - [ ] Deploy to production
    - [ ] Smoke tests
    - [ ] Slack notification

---

## 📋 PHASE 4: CLOUD DEPLOYMENT (3-5 Days)

### Cloud Provider Setup (Choose One)

#### Option A: AWS ECS (Elastic Container Service)
- [ ] Create AWS account and IAM roles
- [ ] Create ECR registry for images
- [ ] Create ECS cluster
- [ ] Create task definitions
  - [ ] Backend task (CPU: 512, Memory: 1024)
  - [ ] Frontend task (CPU: 256, Memory: 512)
- [ ] Create services
  - [ ] Backend service (1 task, auto-scaling)
  - [ ] Frontend service (1-2 tasks, auto-scaling)
- [ ] Setup load balancer (ALB)
  - [ ] Route /api -> backend service
  - [ ] Route / -> frontend service
- [ ] Configure RDS for production database
  - [ ] Migrate from SQLite to PostgreSQL
  - [ ] Setup backups and replication

#### Option B: Google Cloud Run
- [ ] Create GCP project
- [ ] Create Artifact Registry repositories
- [ ] Configure Cloud Run services
  - [ ] Backend service (1-10 instances, CPU: 1, Memory: 512)
  - [ ] Frontend service (1-10 instances, CPU: 1, Memory: 256)
- [ ] Setup Cloud SQL for database
  - [ ] PostgreSQL instance
  - [ ] Automatic backups
- [ ] Configure Cloud Load Balancing
- [ ] Setup IAM permissions

#### Option C: Heroku (Simplest)
- [ ] Create Heroku apps
  - [ ] `arbet-backend` (dyno: standard-1x or higher)
  - [ ] `arbet-frontend` (dyno: standard-1x)
- [ ] Configure buildpacks
  - [ ] Backend: Python
  - [ ] Frontend: Node.js
- [ ] Add environment variables via Heroku CLI
- [ ] Setup PostgreSQL add-on
- [ ] Enable auto-scaling (if using paid tiers)

### Monitoring & Logging
- [ ] Setup CloudWatch (AWS) / Cloud Logging (GCP) / Heroku Logs
  - [ ] Centralize logs from all services
  - [ ] Setup log alerts for errors
  - [ ] Create dashboards
- [ ] Setup monitoring
  - [ ] Health check endpoints
  - [ ] Response time monitoring
  - [ ] Error rate alerts
  - [ ] Database connection monitoring
- [ ] Setup APM (Application Performance Monitoring)
  - [ ] NewRelic, Datadog, or similar
  - [ ] Instrument backend with APM library
  - [ ] Monitor slow queries

### Domain & SSL
- [ ] Register domain (if not already done)
- [ ] Configure DNS
  - [ ] Point to load balancer / cloud service
  - [ ] Setup CNAME records
- [ ] Setup SSL certificate
  - [ ] Use managed service (AWS ACM, GCP managed certs, Let's Encrypt)
  - [ ] Auto-renewal configuration
- [ ] Configure HTTPS redirect
  - [ ] Redirect HTTP -> HTTPS

### Database
- [ ] Choose managed database service
  - [ ] AWS RDS PostgreSQL
  - [ ] Google Cloud SQL
  - [ ] DigitalOcean Managed PostgreSQL
- [ ] Configure backups
  - [ ] Automated daily backups
  - [ ] Retention: 30 days minimum
  - [ ] Test restore process
- [ ] Setup database migrations
  - [ ] Create migration framework (Alembic for Python)
  - [ ] Plan migration from SQLite to PostgreSQL
  - [ ] Document backup/restore procedures

### Auto-Scaling
- [ ] Configure horizontal scaling
  - [ ] Backend: Scale based on CPU (>70%) and memory (>80%)
  - [ ] Frontend: Scale based on request count
- [ ] Set limits
  - [ ] Min: 1 instance per service
  - [ ] Max: 10-50 instances (adjust based on load)
- [ ] Test scaling
  - [ ] Load test to verify scaling triggers
  - [ ] Monitor costs during scaling

### Documentation
- [ ] Create `DEPLOYMENT.md`
  - [ ] Architecture diagram
  - [ ] Step-by-step deployment guide
  - [ ] Environment variable guide for production
  - [ ] Rollback procedures
  - [ ] Scaling and monitoring setup
  - [ ] Incident response procedures
- [ ] Create runbooks for:
  - [ ] Deployment process
  - [ ] Rollback procedure
  - [ ] Database migration
  - [ ] Scaling events
  - [ ] Incident response

---

## ✅ Verification Checklist

### After Phase 1 (Docker)
- [ ] `docker-compose up` starts all services
- [ ] Backend responds to `curl http://localhost:8000/health`
- [ ] Frontend accessible at `http://localhost:3000`
- [ ] Frontend can communicate with backend
- [ ] SQLite database persists across container restarts
- [ ] Logs are visible with `docker-compose logs`

### After Phase 2 (Environment)
- [ ] `.env` can be created from `.env.example`
- [ ] GitHub Secrets are configured
- [ ] CI workflows can access secrets without exposing them
- [ ] Production environment is documented

### After Phase 3 (CI/CD)
- [ ] Docker images build in GitHub Actions
- [ ] Images are pushed to registry
- [ ] All tests pass in CI
- [ ] Security scanning completes
- [ ] Integration tests pass

### After Phase 4 (Cloud)
- [ ] Application accessible at public domain
- [ ] HTTPS working correctly
- [ ] Database accessible from application
- [ ] Logging and monitoring setup
- [ ] Auto-scaling tested
- [ ] Backup and restore tested

---

## 🚨 Common Issues & Solutions

### Docker Issues
| Issue | Solution |
|-------|----------|
| "Port 8000 already in use" | Kill existing process or use different port |
| "Module not found" in container | Rebuild image, check requirements.txt |
| "Cannot connect to backend from frontend" | Check docker-compose networks, service names |
| "Volumes not persisting" | Check volume path, permissions, container filesystem |

### Environment Issues
| Issue | Solution |
|-------|----------|
| "API key not working" | Verify API key is correct, not expired |
| "RPC endpoint timeout" | Check network connection, try different RPC |
| "CORS errors" | Ensure CORS_ORIGINS includes frontend domain |

### CI/CD Issues
| Issue | Solution |
|-------|----------|
| "Test timeout in GitHub Actions" | Increase timeout, optimize tests |
| "Secret not available in action" | Check secret is added in repo Settings |
| "Image push fails" | Verify registry credentials, image name format |

---

## 📊 Success Criteria

| Milestone | Success Criteria | Timeline |
|-----------|-----------------|----------|
| Phase 1 | `docker-compose up` works locally, all services healthy | Day 2-3 |
| Phase 2 | `.env` setup documented, GitHub Secrets configured | Day 4 |
| Phase 3 | All CI workflows passing, images pushing to registry | Day 6-7 |
| Phase 4 | Application live on production domain, auto-scaling working | Day 12-15 |

---

## 📞 Support Resources

- **Docker:** https://docs.docker.com/
- **Docker Compose:** https://docs.docker.com/compose/
- **GitHub Actions:** https://docs.github.com/en/actions
- **Solana RPC:** https://docs.solana.com/api/http
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **FastAPI Deployment:** https://fastapi.tiangolo.com/deployment/

---

**Next Step:** Start implementing Phase 1 (Docker Containerization)
