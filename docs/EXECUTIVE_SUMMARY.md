# 📋 Arbet Agents — Executive Summary for Engineers

**Date:** April 14, 2026 | **Status:** Ready for 14-Day Hackathon Sprint

---

## What is Arbet?

**Arbet Agents** is a fully autonomous AI multi-agent swarm that detects and executes arbitrage on **correlated mispricings** across Solana prediction markets. It's the first system to exploit mathematical inconsistencies between related markets (e.g., election outcomes that don't sum to 100%) at scale.

**Core Innovation:** 4-agent swarm (Scout → Forecaster → Coordinator → Executor) orchestrated by LangGraph, with transparent reasoning logs for judges to see AI decision-making in real-time.

---

## Why It Matters (For Judges)

✅ **Autonomous:** No human intervention needed; agents run 24/7
✅ **Transparent:** Real-time dashboard shows agent thinking; you'll see probabilities, scores, risk checks, and trade execution
✅ **Correlated Event Logic:** 4 detection classes (incoherence, cross-platform spread, Pyth divergence, temporal arbitrage)
✅ **Zero Cost:** Ollama local LLM, Helius free, Vercel free, Solana devnet
✅ **On-Chain Proofs:** Every trade immutable on-chain; TradeLog PDAs verifiable in Solana explorer
✅ **Scalable:** Modular smart contract + agent architecture ready for post-hackathon mainnet

---

## Architecture at a Glance

```
┌────────────────────────────────────────────────────────┐
│  L1: BLOCKCHAIN (Solana Devnet)                        │
│  - Smart Contract: Anchor v1.0.0                       │
│  - VaultPDA, GlobalConfig, TradeLog, ShareMint (Token-2022)
├────────────────────────────────────────────────────────┤
│  L2: AGENT BACKEND (Python + LangGraph)                │
│  - Scout: Poll markets (Capitola, Polymarket, Hedgehog)│
│  - Forecaster: Score opportunities (4 correlated logic)│
│  - Coordinator: Enforce risk rules                     │
│  - Executor: Build & submit Jito bundles              │
├────────────────────────────────────────────────────────┤
│  L3: FRONTEND (Next.js + React)                        │
│  - Wallet connect → Vault operations                   │
│  - Real-time dashboard with agent logs                │
│  - WebSocket streaming (fallback: REST polling)        │
├────────────────────────────────────────────────────────┤
│  L4: DATA (SQLite + Ollama)                            │
│  - SQLite: users, trades, opportunities, agent_logs   │
│  - Vector store: RAG embeddings for historical patterns│
├────────────────────────────────────────────────────────┤
│  L5: ORACLE & MEV (Pyth + Jito)                        │
│  - Pyth: Price feeds + confidence intervals            │
│  - Jito: Atomic bundle execution                       │
└────────────────────────────────────────────────────────┘
```

---

## Team Responsibilities

### Smart Contract Team (1–2 engineers)
- **Days 1–4:** SC-01, SC-02, SC-03
- **Deliverable:** Deployable Anchor program with all instructions
- **Key Skills:** Rust, Anchor, Solana program design

### Agent Backend Team (2–3 engineers)
- **Days 4–13:** AG-01 (Scout), AG-02 (Forecaster), AG-03 (Executor), AG-04 (Coordinator), AG-05 (LangGraph)
- **Deliverable:** 4-agent swarm running end-to-end; SQLite + RAG
- **Key Skills:** Python, LangGraph, API integration, LLM prompting

### Frontend Team (1–2 engineers)
- **Days 5–12:** FE-01 (Wallet), FE-02 (Dashboard), FE-03 (Settings)
- **Deliverable:** Next.js dashboard on Vercel; real-time WebSocket
- **Key Skills:** React, Next.js, TypeScript, Recharts

### Integration & DevOps (1 engineer)
- **Days 10–14:** INT-01, documentation, demo setup
- **Deliverable:** End-to-end test harness, README, demo video
- **Key Skills:** Bash, git, Solana CLI, debugging

---

## 14-Day Sprint Plan

| Phase | Days | Focus | Deliverable |
|-------|------|-------|-------------|
| **Foundation** | 1–4 | Smart contract skeleton + core logic | Deployable to devnet |
| **Agent Loop** | 4–9 | Scout, Forecaster, Executor, LangGraph | Full swarm running e2e |
| **Frontend** | 5–10 | Wallet, dashboard, WebSocket | Vercel deployment |
| **Risk & Integration** | 10–13 | Coordinator, risk settings, full flow | 10+ trade cycles verified |
| **Polish & Demo** | 14 | Documentation, video, submission | Hackathon-ready package |

**Critical Path:** SC-01 → SC-02 → AG-01 → AG-02 → AG-03 → AG-04 → AG-05 → INT-01 = 14 days

---

## Success Criteria (Judges' Checklist)

### Must-Have P0
- ✅ Wallet connects → vault created on-chain
- ✅ Scout detects real spreads from 3 platforms
- ✅ Forecaster applies all 4 correlated event detection classes
- ✅ Coordinator enforces risk limits on-chain
- ✅ Executor submits Jito bundles; trades execute atomically
- ✅ TradeLog PDAs immutable on-chain; verifiable in explorer
- ✅ Dashboard shows agent reasoning in real-time (<500ms latency)
- ✅ Circuit breaker triggers when drawdown exceeded

### Nice-to-Have P1
- RAG retrieval from past trades
- Risk settings panel (adjust max_position_bps, drawdown, etc.)
- Correlated event probability graphs
- CSV trade history export

---

## Critical Path Dependencies

```
SC-01 (2d) → SC-02 (1d) → AG-01 (2d) → AG-02 (2d) →
AG-03 (2d) → AG-04 (1.5d) → AG-05 (1.5d) → INT-01 (1.5d)
= 14 days total

Parallel:
- SC track: 4 days (finish by Day 4)
- Data track: 1 day (complete Day 1, used by AG-02 Day 6)
- FE track: 3.5 days (start Day 4, finish by Day 10)
```

**Key Bottleneck:** Agent orchestration (AG-05) is the most complex; start early, test thoroughly.

---

## Known Risks & Mitigations

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Ollama LLM JSON format fails | Medium | Pydantic validation + retry with temp=0 |
| Helius free tier rate-limited | Low | Primary: Helius, Fallback: public Devnet |
| Jito devnet bundle API unavailable | Low | Fallback to simulateTransaction |
| Polymarket API format change | Medium | Capitola as primary; monitor Polymarket |
| Agent swarm deadlock | Medium | Timeouts on every node; max retries |
| Scout polling too slow | Low | Start with 30s intervals; optimize to 10s |

---

## Deployment Checklist

**Before Day 14 (Final Submission):**

- [ ] All Anchor programs deployed to devnet
- [ ] Helius free tier configured (1M credits)
- [ ] Ollama running (Qwen3-8B preloaded)
- [ ] SQLite database initialized with schema
- [ ] Next.js deployed to Vercel
- [ ] All 4 agents running in LangGraph
- [ ] WebSocket connection tested
- [ ] 10+ successful trade cycles executed
- [ ] All TXs verifiable in Solana explorer
- [ ] Agent logs complete; audit trail intact

**Documentation Package:**
- [ ] README (5-min local setup, 5-min demo walkthrough)
- [ ] Architecture diagram (this file, formatted nicely)
- [ ] Demo video (5 minutes, showing full trade execution)
- [ ] Troubleshooting guide (common errors + fixes)
- [ ] Technical glossary (PRD Section 15)

---

## Quick Reference: Key Technologies

| Component | Tech | Version | Cost |
|-----------|------|---------|------|
| **Smart Contract** | Anchor | 1.0.0 | Free |
| **Smart Contract** | Rust | 1.85.0+ | Free |
| **Agent Orchestration** | LangGraph | Latest | Free |
| **LLM Runtime** | Ollama | 0.18+ | Free |
| **LLM Model** | Qwen3-8B | Q4_K_M | Free |
| **Frontend** | Next.js | 15 | Free |
| **Frontend Hosting** | Vercel | Free tier | Free |
| **Database** | SQLite | Latest | Free |
| **Vector Store** | SQLite-vec | Latest | Free |
| **Embedding Model** | nomic-embed-text | Latest | Free |
| **RPC** | Helius | Free tier | Free ($0) |
| **MEV Bundle** | Jito | Devnet | Free (no tips) |
| **Oracle** | Pyth | Devnet | Free |
| **Token Standard** | Token-2022 | Latest | Free |

**Total MVP Cost: $0** ✅

---

## Acceptance Criteria by Task

### SC-01: Anchor Skeleton
- ✅ `anchor build` compiles without errors
- ✅ VaultPDA, GlobalConfig, TradeLog PDAs created
- ✅ deposit/withdraw instructions working
- ✅ IDL generated & committed

### SC-02: Trade Execution & Risk
- ✅ execute_arb, record_trade, update_config, emergency_pause deployed
- ✅ Position limits enforced on-chain
- ✅ Pause flag blocks execute_arb
- ✅ All 4 instructions <120k CU

### AG-01: Scout Agent
- ✅ Fetches from Capitola, Polymarket, Hedgehog every 10–30s
- ✅ Detects spreads >300bps
- ✅ 5+ opportunities/hour on active markets
- ✅ Error handling: survives 10+ min API downtime

### AG-02: Forecaster Agent
- ✅ Detects all 4 mispricing classes (incoherence, spread, divergence, temporal)
- ✅ Edge estimates within ±10% of actual
- ✅ RAG context injected (top-5 similar trades)
- ✅ Outputs valid JSON (ScoredOpportunity schema)

### AG-03: Executor Agent
- ✅ Builds valid Jito bundles
- ✅ Aborts trades exceeding slippage threshold
- ✅ TX confirmed on-chain <5s
- ✅ CU usage <120k per instruction

### AG-04: Coordinator Agent
- ✅ Blocks trades exceeding position limits
- ✅ Triggers circuit breaker on drawdown
- ✅ All decisions logged with reasoning

### AG-05: LangGraph Orchestration
- ✅ Graph initializes without errors
- ✅ State TypedDict properly passed between agents
- ✅ Checkpointing enables pause/resume
- ✅ Full loop executes 10–30s without deadlock

### FE-01: Wallet & Vault
- ✅ Wallet connects <3s
- ✅ Deposit confirms <5s
- ✅ Dashboard reflects balance immediately

### FE-02: Dashboard
- ✅ WebSocket connects <1s
- ✅ Agent logs stream <500ms latency
- ✅ PnL chart updates per trade
- ✅ Lighthouse >90 performance

### INT-01: E2E Flow
- ✅ Wallet deposit → vault creation → agent detection → execution → dashboard update
- ✅ Failure scenarios tested (slippage, pause, drawdown, RPC failure)
- ✅ 1+ hour continuous operation without crash

---

## Common Questions

**Q: How do I get started?**
A: Read ENGINEERING_BREAKDOWN.md (this file) for task assignments. Assign SC-01 to Smart Contract team first.

**Q: What if Ollama is too slow?**
A: Use Phi-4 (3.8B, faster) as fallback. Groq free tier as last resort. Document which model used in README.

**Q: What if Helius free tier runs out?**
A: 1M credits ≈ 10,000 complex API calls. Sufficient for 14 days. Monitor Helius dashboard; switch to public RPC if needed (slower, but free).

**Q: Do I need to pay for anything?**
A: No. All tech is free during hackathon. Post-hackathon mainnet: Helius Starter ($50/mo), Supabase Pro, AWS Secrets Manager.

**Q: How do I demo this to judges?**
A: Run `npm run dev` on frontend + Python agent backend locally. Connect Phantom with devnet account (airdrop 2 SOL). Click "Deposit" → Watch agent logs stream in real-time → Click trades in explorer.

**Q: What if a trade fails?**
A: Executor retries 3x with backoff. If all fail, logs error; Coordinator skips next cycle. No funds lost (on-chain validation prevents invalid trades).

**Q: How is this different from existing bots?**
A: Existing bots use static spread thresholds on single markets. Arbet agents use **correlated event logic** (multi-market analysis) + **AI reasoning** (transparent decision-making) + **4-agent swarm** (coordinated governance). No competitor in this category.

---

## Next Steps (Monday Morning)

1. **Kick-off meeting:** Assign tasks to teams; finalize technical decisions (OQ-01 through OQ-08 in ENGINEERING_BREAKDOWN.md)
2. **Environment setup:** Install Rust, Anchor, Python, Ollama, Node.js
3. **SC team starts:** SC-01 (Anchor skeleton) — target completion by Day 2 EOD
4. **Backend team prepares:** Set up Python project structure, dependencies (LangGraph, solana-py, solders, jito-py, etc.)
5. **Frontend team prepares:** Next.js setup, wallet-adapter, Recharts integration
6. **Daily standups:** 15-min sync; unblock immediately

**Estimated total effort:** 14 days, 6–7 engineers, $0 out-of-pocket

---

## Success Looks Like (Day 14)

You're on a Zoom call with judges. You:

1. **Load the dashboard:** https://arbet-agents.vercel.app
2. **Connect Phantom wallet:** "Watch, it auto-detects my vault" (PDA address displayed)
3. **Click Deposit:** 1 SOL transferred, confirmed in <5s
4. **Watch Scout:** "Every 10–30 seconds, Scout fetches prices from Capitola and Polymarket"
5. **Watch Forecaster:** "Here it is now: detected a 5% mispricing. Probability incoherence. Forecaster scoring it... confidence 0.85, estimated edge 350bps"
6. **Watch Coordinator:** "Risk check: position size 0.5% TVL ✓, drawdown 0.2% ✓, correlation risk adjusted ✓. Approved"
7. **Watch Executor:** "Building Jito bundle... simulating... submitting... TX confirmed!"
8. **Refresh explorer:** "TradeLog PDA #1 created on-chain. Immutable proof of trade."
9. **Check dashboard:** "There it is. Trade in history. PnL +$3.50. Agent reasoning log shows every decision."
10. **Judge nods:** "I see the AI's thinking. That's impressive."

---

**You've done it. Arbet is live.**

---

**Document prepared for Arbet Engineering Team | April 14, 2026**

**Next: Read ENGINEERING_BREAKDOWN.md for detailed task specs.**
