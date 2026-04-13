# 📚 Arbet Agents — Documentation Index

**Generated:** April 14, 2026 | **Status:** Ready for 14-Day Hackathon Sprint

---

## 📖 Documents in This Directory

### 1. **EXECUTIVE_SUMMARY.md** ⭐ START HERE
**For:** Team leads, project managers, judges
**Length:** 10 pages | **Read Time:** 15 min
**What it covers:**
- What is Arbet? (elevator pitch)
- Why it matters for judges (transparency, autonomy, innovation)
- Architecture at a glance
- Team responsibilities & sprint plan
- Success criteria checklist
- Common Q&A

**→ Read this first to understand the big picture**

---

### 2. **ENGINEERING_BREAKDOWN.md** ⭐ MAIN REFERENCE
**For:** Engineers (Smart Contract, Backend, Frontend)
**Length:** 60+ pages | **Read Time:** 1–2 hours
**What it covers:**
- **11 detailed task specifications** (SC, AG, FE, DATA, INT)
- Per-task deliverables, acceptance criteria, dependencies
- 14-day sprint timeline with critical path
- Team allocation & responsibilities
- Missing requirements & ambiguities (OQ-01 through OQ-08)
- Risk register & mitigation strategies
- Success metrics & KPIs

**→ Reference this while building; assign tasks from here**

---

### 3. **ARCHITECTURE_DIAGRAM.md** ⭐ VISUAL REFERENCE
**For:** Architects, engineers, judges
**Length:** 40+ pages | **Read Time:** 30 min
**What it covers:**
- Full system architecture (5 layers: blockchain, agents, frontend, data, oracle/MEV)
- ASCII diagrams of all major components
- Detailed trade execution data flow (15+ steps, from Scout to Dashboard)
- Risk circuit breaker flow
- Component interaction matrix
- WebSocket vs REST fallback strategy

**→ Review before starting implementation; reference during integration testing**

---

### 4. **PRD.md** (Original Product Requirements Document)
**For:** Reference, requirements validation
**Length:** 140+ pages (comprehensive specification)
**What it covers:**
- Executive summary & value proposition
- Problem statement & market opportunity
- Technology stack (in extreme detail)
- Target personas & user stories
- AI agent architecture specification
- Smart contract specification
- Functional requirements (FR-01 through FR-24)
- System architecture & data flow
- Frontend specification
- Security architecture & risk management
- KPIs & success metrics
- Development roadmap & milestones
- Open questions & technical decisions
- Appendices (tool reference, risk register, glossary)

**→ Source of truth for all specifications; reference when clarifying requirements**

---

## 🚀 How to Use These Documents

### For a **New Engineer** Joining the Team:
1. Read **EXECUTIVE_SUMMARY.md** (15 min) — understand what you're building
2. Skim **ARCHITECTURE_DIAGRAM.md** (10 min) — see how components interact
3. Read the task assigned to you in **ENGINEERING_BREAKDOWN.md** (30 min) — understand deliverables & acceptance criteria
4. Reference **PRD.md** if you need technical details on your component

### For a **Tech Lead** Organizing the Sprint:
1. Read **EXECUTIVE_SUMMARY.md** (15 min) — grasp the scope
2. Review **ENGINEERING_BREAKDOWN.md** Section "Team Allocation & Responsibilities" (10 min) — assign tasks
3. Use **ENGINEERING_BREAKDOWN.md** task descriptions to create Jira tickets / task board
4. Reference critical path diagram when scheduling

### For **Judges** Evaluating at Hackathon:
1. Read **EXECUTIVE_SUMMARY.md** (15 min) — understand innovation & value
2. Watch the **demo video** (5 min) — see the system running
3. Refer to **ARCHITECTURE_DIAGRAM.md** if you want to understand data flow (10 min)
4. Review **PRD.md** Sections 1–6 (20 min) if you want competitive/market context

---

## 📋 Quick Reference Tables

### Task Dependencies (Critical Path)

```
SC-01 (2d)
   ↓
SC-02 (1d) ← DATA-01 (1d) parallel
   ↓
AG-01 (2d)
   ↓
AG-02 (2d) ← FE-01 (1.5d) parallel
   ↓
AG-03 (2d) ← FE-02 (2d) parallel
   ↓
AG-04 (1.5d)
   ↓
AG-05 (1.5d)
   ↓
FE-03 (1d) ← Coordinator ready
   ↓
INT-01 (1.5d)

TOTAL: 14 days
```

### Effort Breakdown by Team

| Team | # Engineers | Tasks | Total Days | Key Skills |
|------|---|---|---|---|
| **Smart Contract** | 1–2 | SC-01, SC-02, SC-03 | 4 | Rust, Anchor, PDA design |
| **Agent Backend** | 2–3 | AG-01, AG-02, AG-03, AG-04, AG-05, DATA-01 | 9.5 | Python, LangGraph, API integration, LLM prompting |
| **Frontend** | 1–2 | FE-01, FE-02, FE-03 | 4 | React, Next.js, TypeScript, Recharts |
| **Integration & DevOps** | 1 | INT-01, docs, demo | 3.5 | Bash, git, Solana CLI, debugging |
| **TOTAL** | 5–7 | All | 14 | Cross-functional |

---

## ✅ Pre-Hackathon Checklist

- [ ] All engineers have read EXECUTIVE_SUMMARY.md
- [ ] Tech lead has assigned tasks from ENGINEERING_BREAKDOWN.md
- [ ] Environment setup complete:
  - [ ] Rust 1.85.0+ installed
  - [ ] Anchor 1.0.0 installed (avm)
  - [ ] Solana CLI 3.0.10 installed
  - [ ] Python 3.12+ installed
  - [ ] Node.js 18+ installed
  - [ ] Ollama 0.18+ installed (with Qwen3-8B preloaded)
- [ ] Git repository initialized (with .gitignore for .env, keys, etc.)
- [ ] Daily standup scheduled (15 min, 9:00 AM)
- [ ] Slack/Discord channel created for real-time blockers

---

## 🎯 Acceptance Criteria (Day 14 Submission)

### Code & Deployment
- [ ] All Anchor programs deploy to devnet without warnings
- [ ] All Python agent code runs without exceptions
- [ ] Next.js frontend deployed to Vercel free tier
- [ ] SQLite database initialized with correct schema
- [ ] All 4 agents orchestrated in LangGraph StateGraph

### Functionality
- [ ] 10+ successful trade cycles executed on devnet
- [ ] All TradeLog PDAs verifiable in Solana explorer
- [ ] Dashboard updates in real-time (<500ms WebSocket latency)
- [ ] Circuit breaker triggers correctly on drawdown exceeded
- [ ] Agent reasoning logs capture 100% of decisions

### Documentation
- [ ] README.md with 5-min local setup instructions
- [ ] Demo video (5 min) showing full trade execution flow
- [ ] Troubleshooting guide (common errors + fixes)
- [ ] This documentation index + all referenced files

### Judges' Wow Factor
- [ ] Judges can see the agent "thinking" in real-time
- [ ] Judges can verify trades immutably on-chain
- [ ] Judges can confirm this is fully autonomous (no human intervention)
- [ ] Judges understand correlated event detection is novel in the category

---

## 📞 Support & Escalation

### Common Blockers

**Smart Contract bottlenecks:**
- Anchor version issues: Use AVM (`avm install 1.0.0 && avm use 1.0.0`)
- CU calculation errors: Prepend `compute_budget::set_compute_unit_limit(120000)` to each tx
- PDA derivation bugs: Use Anchor's `seeds=` constraint; verify seeds with `solana-cli pubkey-for-program-address`

**Agent Backend bottlenecks:**
- LLM JSON parsing: Implement Pydantic validation + retry with `temperature=0`
- API rate limits: Use Capitola as primary; Polymarket as fallback; cache last response
- WebSocket connection drops: Implement REST polling fallback every 10s

**Frontend bottlenecks:**
- Wallet connection timeout: Increase timeout from 3s to 10s; check wallet extension is installed
- WebSocket latency: Verify backend is running; check network tab for 101 Upgrade response
- Chart rendering lag: Lazy-load Recharts; virtualize trade table for >1000 rows

### Escalation Path
1. **Question about specification?** → Refer to PRD.md (Section 1–6, 7–11)
2. **Question about task scope?** → Refer to ENGINEERING_BREAKDOWN.md (Section 2–4)
3. **Question about architecture?** → Refer to ARCHITECTURE_DIAGRAM.md
4. **Blocking technical issue?** → Post in team Slack; tag Tech Lead for 24-hour response target

---

## 🔄 Document Maintenance

**This documentation is:**
- ✅ Complete as of April 14, 2026
- ✅ Aligned with PRD v2.0
- ✅ Reflects Anchor v1.0.0 (released April 2, 2026)
- ✅ Reflects LangGraph 2026 features
- ✅ Production-grade for devnet MVP

**Update this documentation if:**
- Anchor or key dependencies change versions
- Architecture decisions deviate from these designs
- New risks emerge during development
- Post-hackathon roadmap is finalized

---

## 📄 File Manifest

```
/home/cn/projects/competition/web3/Arbet/docs/
├── EXECUTIVE_SUMMARY.md (14 KB) ← Start here
├── ENGINEERING_BREAKDOWN.md (72 KB) ← Main reference
├── ARCHITECTURE_DIAGRAM.md (74 KB) ← Visual reference
├── PRD.md (58 KB) ← Source of truth
└── README.md (TBD) ← User-facing setup guide
```

---

## 🎓 Learning Resources

### For Solana Smart Contracts
- Anchor Book: https://book.anchor-lang.com/ (covers v1.0.0)
- Solana Docs: https://docs.solana.com/ (official reference)
- Program Derived Addresses (PDAs): https://docs.solana.com/developing/programming-model/calling-between-programs#program-derived-addresses

### For LangGraph & Multi-Agent Systems
- LangGraph Docs: https://langchain-ai.github.io/langgraph/
- LangSmith: https://smith.langchain.com/ (observability platform)

### For Python Solana Development
- solana-py Docs: https://github.com/michaelhly/solana-py
- solders: https://github.com/kevinheavey/solders

### For Jito MEV Protection
- jito-py: https://github.com/jito-labs/jito-py
- Bundle Mechanics: https://jito-labs.gitbook.io/mev-bundle-api/

---

## 🎉 Success Narrative (What You're Building)

By Day 14, you'll have built the **first fully autonomous AI agent swarm for prediction market arbitrage on Solana**. When judges see it:

1. **Connect wallet** → Vault creates on-chain (immutable)
2. **Deposit funds** → Smart contract holds capital non-custodially
3. **Watch Scout** → Fetches prices from 3 platforms every 10–30s
4. **Watch Forecaster** → Applies AI reasoning to detect correlated mispricings
5. **Watch Coordinator** → Enforces risk rules on-chain
6. **Watch Executor** → Submits atomic Jito bundles to devnet
7. **See TradeLog PDA** → Immutable on-chain proof of trade execution
8. **View Dashboard** → Real-time agent reasoning, PnL, audit trail
9. **Click Explorer Link** → Verify trade on-chain in <1 second
10. **Judge Reaction:** "I can see the AI's thinking. It's autonomous. It's transparent. This is production-grade."

**That's the goal. Let's build it.**

---

**Questions? Start with EXECUTIVE_SUMMARY.md, then ENGINEERING_BREAKDOWN.md.**

**Ready to code? Assign tasks, read your task description, execute.**

**14 days to greatness. Let's go! 🚀**

---

*Document prepared by Claude Code | April 14, 2026*
