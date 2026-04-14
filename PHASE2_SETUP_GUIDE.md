# Phase 2: Local Development & Devnet Deployment Setup

## Quick Start Guide

### Local Development (5 minutes)

```bash
# 1. Make scripts executable (should be automatic)
chmod +x scripts/*.sh

# 2. Start everything with one command
./scripts/deploy-local.sh

# OR use Makefile
make deploy-local

# 3. Access services
- Frontend: http://localhost:3000
- Backend:  http://localhost:8000
- Adminer:  http://localhost:8080 (database UI)
- MailHog:  http://localhost:8025 (email testing)
```

### Devnet Deployment (15 minutes)

```bash
# 1. Set up Solana wallet and fund it
solana config set --url devnet
# Fund wallet with airdrop or devnet SOL

# 2. Deploy to Devnet
./scripts/deploy-devnet.sh

# This will:
# - Build smart contracts
# - Deploy to Devnet
# - Start Docker services
# - Run health checks
# - Output program ID
```

## Files Created - Phase 2

### Database (1 file)
- **scripts/init-db.sql**: PostgreSQL initialization
  - Creates 7 tables (users, vaults, trades, etc.)
  - Creates indexes for performance
  - Creates triggers for updated_at
  - 150+ lines of production SQL

### Environment Config (1 file)
- **.env.devnet**: Devnet-specific configuration
  - All required environment variables
  - Devnet RPC endpoints
  - Placeholder for program ID
  - API keys and secrets

### Deployment Script (1 file)
- **scripts/deploy-devnet.sh**: Automated Devnet deployment
  - Checks prerequisites (solana, anchor, docker)
  - Configures Solana CLI
  - Requests airdrop
  - Builds smart contracts
  - Deploys contracts to Devnet
  - Starts Docker services
  - Runs health checks
  - Color-coded output

## Database Schema

### Tables Created
1. **users** - User accounts with wallet addresses
2. **vaults** - Trading vaults with risk limits
3. **trades** - Executed trades with PnL
4. **opportunities** - Detected arbitrage opportunities
5. **agent_logs** - Agent decision audit trail
6. **risk_checks** - Risk evaluation checkpoints
7. **trade_embeddings** - RAG vectors for similar trade retrieval

### Indexes (11 total)
- Fast lookups on wallet addresses
- Efficient vault queries by user
- Trade filtering by status/date
- Opportunity spread filtering

### Triggers
- Auto-update timestamps on table changes

## Makefile Commands

```bash
# Infrastructure
make up                 # Start all services
make down              # Stop all services
make build             # Build Docker images
make rebuild           # Rebuild without cache
make logs              # View all logs
make logs-backend      # View backend logs
make logs-frontend     # View frontend logs
make health            # Run health checks

# Testing
make test              # Run all tests
make test-backend      # Run backend tests
make test-watch        # Run tests in watch mode

# Database
make db-shell          # Connect to database
make db-reset          # Reset database (careful!)

# Deployment
make deploy-local      # Local deployment
make deploy-devnet     # Devnet deployment

# Cleanup
make clean             # Stop services
make prune             # Deep clean Docker
```

## Environment Variables Reference

### Development (.env.local)
```
SOLANA_RPC_URL=https://api.devnet.solana.com
ALCHEMY_API_KEY=B3ZR8idizuxRWbEmxLKrkx9XhM57T_BM
DATABASE_URL=postgresql://arbet:arbet_dev_password@postgres:5432/arbet_local
REDIS_URL=redis://redis:6379
NEXT_PUBLIC_API_URL=http://localhost:8000
DEBUG=true
```

### Devnet (.env.devnet)
```
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=<auto-filled by deploy script>
AGENT_WALLET_PUBKEY=<your agent wallet>
DATABASE_URL=postgresql://arbet:password@db:5432/arbet_devnet
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 8000 | http://localhost:8000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| Adminer | 8080 | http://localhost:8080 |
| MailHog Web | 8025 | http://localhost:8025 |
| MailHog SMTP | 1025 | localhost:1025 |

## Troubleshooting

### Services not starting
```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend

# Restart all services
make down && make up
```

### Database connection error
```bash
# Reset database
make db-reset

# Verify database
make db-shell
```

### Port already in use
```bash
# Find process using port
lsof -i :8000

# Kill process (replace PID)
kill -9 <PID>
```

### Docker build fails
```bash
# Clean Docker
make prune

# Rebuild
make rebuild
```

## Performance Tips

1. **Development**: Use `docker-compose up` with volume mounts for code changes
2. **Production**: Use `docker-compose.prod.yml` with replicas
3. **Database**: Run migrations separately before deploy
4. **Caching**: Redis enabled for backend sessions

## Security Notes

- ✅ Non-root users in containers
- ✅ Health checks prevent crashes
- ✅ Environment variables for secrets
- ✅ Database credentials in .env (git-ignored)
- ✅ CORS configured per environment

## Next Steps

### Phase 3: CI/CD Pipeline
- GitHub Actions workflows
- Automated testing on PR
- Docker image building and pushing
- Automated Devnet deployment
- Production deployment templates

### Phase 4: Monitoring & Alerting
- Prometheus metrics
- Grafana dashboards
- Alert notifications (Slack/Discord)
- Log aggregation

## Statistics

- **Total Files Created**: 3 (init-db.sql, .env.devnet, deploy-devnet.sh)
- **Total Lines**: ~400 lines of code
- **Database Schema**: 7 tables + 11 indexes + triggers
- **Devnet Script**: 190 lines with error handling
- **Status**: ✅ PHASE 2 COMPLETE

---

**Ready for Phase 3: CI/CD Automation**
