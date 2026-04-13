# 🏗️ Arbet Agents — System Architecture & Data Flow Diagram

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          ARBET AGENTS SYSTEM ARCHITECTURE                         │
└──────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: BLOCKCHAIN (Solana Devnet)                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐   │
│  │  Arbet Program      │    │   SPL Token-2022    │    │  Helius RPC      │   │
│  │  (Smart Contract)   │◄──►│   (Vault Shares)    │    │  (Enhanced WS)   │   │
│  │                     │    │                     │    │  (DAS API)       │   │
│  │ • VaultPDA         │    │ • MetadataPointer  │    │  (Webhooks)      │   │
│  │ • GlobalConfig     │    │ • Transfer Hook    │    │  (Tx Parsing)    │   │
│  │ • TradeLog PDA     │    │                     │    │                  │   │
│  │ • Instructions:    │    │                     │    │  Free: 1M        │   │
│  │   - initialize_    │    │                     │    │  credits/month   │   │
│  │     vault          │    │                     │    │                  │   │
│  │   - deposit        │    │                     │    │                  │   │
│  │   - withdraw       │    │                     │    │                  │   │
│  │   - execute_arb    │    │                     │    │                  │   │
│  │   - record_trade   │    │                     │    │                  │   │
│  │   - emergency_     │    │                     │    │                  │   │
│  │     pause          │    │                     │    │                  │   │
│  │                     │    │                     │    │                  │   │
│  │ Compute: <120k CU  │    │                     │    │ Latency: ~140ms │   │
│  │ per instruction    │    │                     │    │                  │   │
│  └─────────────────────┘    └─────────────────────┘    └──────────────────┘   │
│                                        ▲                                        │
│                                        │                                        │
│                         JSON-RPC + WebSocket Subscribe                          │
│                                        │                                        │
└────────────────────────────────────────┼────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: AGENT BACKEND (Python + LangGraph)                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ LangGraph StateGraph (Continuous Loop: 10–30s cycles)                   │  │
│  │                                                                          │  │
│  │  ┌──────────────────┐     ┌──────────────────┐     ┌───────────────┐  │  │
│  │  │  SCOUT AGENT     │────►│ FORECASTER AGENT │────►│ COORDINATOR   │  │  │
│  │  │  (Qwen3-8B)      │     │ (DeepSeek R1 14B)│     │ AGENT (Qwen)  │  │  │
│  │  │                  │     │ [Thinking Mode]  │     │               │  │  │
│  │  │ Tools:           │     │                  │     │ Tools:        │  │  │
│  │  │ • fetch_capitola │     │ Tools:           │     │ • check_vault │  │  │
│  │  │   _prices()      │     │ • pyth_conf_     │     │   _drawdown() │  │  │
│  │  │ • fetch_poly     │     │   check()        │     │ • validate_   │  │  │
│  │  │   market_api()   │     │ • historical_    │     │   position_   │  │  │
│  │  │ • read_hedgehog  │     │   edge_lookup()  │     │   size()      │  │  │
│  │  │   _accounts()    │     │   [RAG]          │     │ • check_corr  │  │  │
│  │  │ • query_pyth_    │     │ • correlation_   │     │   _risk()     │  │  │
│  │  │   feeds()        │     │   matrix_        │     │ • trigger_    │  │  │
│  │  │                  │     │   compute()      │     │   circuit_    │  │  │
│  │  │ Output:          │     │ • black_scholes  │     │   breaker()   │  │  │
│  │  │ list[RawOpp]     │     │   _implied_prob()│     │               │  │  │
│  │  │                  │     │                  │     │ Output:       │  │  │
│  │  │ Interval:        │     │ Output:          │     │ CoordinatorDec│  │  │
│  │  │ 10–30s           │     │ list[ScoredOpp]  │     │ ision         │  │  │
│  │  │                  │     │                  │     │               │  │  │
│  │  │ Latency: Fetch   │     │ Latency: 2–4s    │     │ Latency: 1–2s │  │  │
│  │  └──────────────────┘     └──────────────────┘     └────────┬──────┘  │  │
│  │                                                              │          │  │
│  │                                                              ▼          │  │
│  │                                                   ┌──────────────────┐ │  │
│  │                                                   │ EXECUTOR AGENT   │ │  │
│  │                                                   │ (Qwen3-8B)       │ │  │
│  │                                                   │                  │ │  │
│  │                                                   │ Tools:           │ │  │
│  │                                                   │ • build_buy_     │ │  │
│  │                                                   │   instruction()  │ │  │
│  │                                                   │ • build_sell_    │ │  │
│  │                                                   │   instruction()  │ │  │
│  │                                                   │ • simulate_      │ │  │
│  │                                                   │   bundle_jito()  │ │  │
│  │                                                   │ • send_jito_     │ │  │
│  │                                                   │   bundle()       │ │  │
│  │                                                   │ • record_trade_  │ │  │
│  │                                                   │   pda()          │ │  │
│  │                                                   │ • dynamic_tip_   │ │  │
│  │                                                   │   calculation()  │ │  │
│  │                                                   │                  │ │  │
│  │                                                   │ Output:          │ │  │
│  │                                                   │ ExecutionResult  │ │  │
│  │                                                   │                  │ │  │
│  │                                                   │ Latency: 1–2s    │ │  │
│  │                                                   └──────────────────┘ │  │
│  │                                                                          │  │
│  │  ┌────────────────────────────────────────────────────────────────┐    │  │
│  │  │ Shared State (TypedDict):                                      │    │  │
│  │  │ • market_snapshot: {market_id: {bid, ask, timestamp}}         │    │  │
│  │  │ • opportunities: list[RawOpportunity]                         │    │  │
│  │  │ • scored_opps: list[ScoredOpportunity]                        │    │  │
│  │  │ • approved_trade: Trade | None                                │    │  │
│  │  │ • execution_result: ExecutionResult | None                    │    │  │
│  │  │ • risk_state: RiskState                                       │    │  │
│  │  │ • agent_logs: list[str] (human-readable reasoning)            │    │  │
│  │  │ • error_state: str | None                                     │    │  │
│  │  │                                                                │    │  │
│  │  │ Checkpointing: SQLite (devnet) or Supabase (mainnet)         │    │  │
│  │  │ • Enables pause/resume                                       │    │  │
│  │  │ • Enables time-travel debugging                              │    │  │
│  │  └────────────────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ External LLM Runtime                                                     │  │
│  │                                                                          │  │
│  │  ┌─────────────────────┐    ┌─────────────────────┐                    │  │
│  │  │ Ollama (Local)      │    │ Qwen3-8B (Q4_K_M)   │                    │  │
│  │  │                     │◄──►│ ~6GB RAM            │                    │  │
│  │  │ OpenAI-compatible   │    │ 40–60 tokens/sec    │                    │  │
│  │  │ HTTP API            │    │ (CPU-only)          │                    │  │
│  │  │ http://localhost:   │    │                     │                    │  │
│  │  │ 11434/api/          │    │ Fallback:           │                    │  │
│  │  │                     │    │ DeepSeek R1 14B     │                    │  │
│  │  │                     │    │ (Forecaster only)   │                    │  │
│  │  │                     │    │                     │                    │  │
│  │  │                     │    │ Lightweight:        │                    │  │
│  │  │                     │    │ Phi-4 3.8B          │                    │  │
│  │  │                     │    │ (if <8GB RAM)       │                    │  │
│  │  └─────────────────────┘    └─────────────────────┘                    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                          │                              │
                          │ WebSocket                    │ REST API
                          │ (agent_logs, trades)         │ (/api/trades, /api/opps)
                          │                              │
                          ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: FRONTEND (Next.js + React)                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Dashboard (Vercel Free Tier)                                             │  │
│  │ localhost:3000 → https://arbet-agents.vercel.app                         │  │
│  │                                                                          │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │  │
│  │  │ Wallet Connect   │  │ Vault Overview   │  │ Agent Status (4x)│     │  │
│  │  │ Button           │  │                  │  │                  │     │  │
│  │  │ (Phantom, etc.)  │  │ • Vault Address  │  │ • Scout Status   │     │  │
│  │  │                  │  │ • TVL            │  │ • Forecaster     │     │  │
│  │  │ Connect/Disconnect│ │ • Share Balance  │  │ • Coordinator    │     │  │
│  │  │                  │  │ • Share Price    │  │ • Executor       │     │  │
│  │  │                  │  │                  │  │                  │     │  │
│  │  │ Connected: [addr]│  │                  │  │ [+ metrics]      │     │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘     │  │
│  │                                                                         │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │  │
│  │  │ Deposit Modal    │  │ Withdraw Modal   │  │ Emergency Pause  │    │  │
│  │  │                  │  │                  │  │ Button           │    │  │
│  │  │ Amount Input     │  │ Calculate exit   │  │                  │    │  │
│  │  │ [0.0]            │  │ Burn shares      │  │ [⏸ PAUSE]       │    │  │
│  │  │                  │  │ Withdraw funds   │  │                  │    │  │
│  │  │ Currency         │  │                  │  │ Pause → blocks   │    │  │
│  │  │ ◆ SOL            │  │                  │  │ execute_arb      │    │  │
│  │  │ ◆ USDC           │  │ [Confirm]        │  │                  │    │  │
│  │  │                  │  │                  │  │ [✓ RESUME]       │    │  │
│  │  │ [Deposit]        │  │                  │  │                  │    │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘    │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────┐    │  │
│  │  │ Live Opportunity Feed                                        │    │  │
│  │  │ (Scrolling list, max 50)                                    │    │  │
│  │  │                                                              │    │  │
│  │  │ SOL > $200 ↔ SOL > $210              [Spread: 520bps]      │    │  │
│  │  │ Capitola: 45% bid/52% ask            [Detection: cross-    │    │  │
│  │  │ Polymarket: 48% bid/55% ask          platform]             │    │  │
│  │  │                                                              │    │  │
│  │  │ BTC > $100K ↔ BTC > $120K by EOY      [Spread: 320bps]    │    │  │
│  │  │ Capitola: 30% bid/35% ask            [Detection: incohere]│    │  │
│  │  │ Polymarket: 32% bid/38% ask                                │    │  │
│  │  └──────────────────────────────────────────────────────────────┘    │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────┐    │  │
│  │  │ Agent Reasoning Log (Auto-scroll, max 1000 lines)           │    │  │
│  │  │                                                              │    │  │
│  │  │ [14:22:15] [Scout] Fetched 7 opportunities; max spread 520 │    │  │
│  │  │ [14:22:16] [Forecaster] Top opp: SOL>200 edge est 520bps   │    │  │
│  │  │ [14:22:17] [Forecaster] Confidence: 0.87 (incoherence)     │    │  │
│  │  │ [14:22:18] [Coordinator] ✓ Approved (pos: 0.5% TVL, dd:0.2)│    │  │
│  │  │ [14:22:19] [Executor] Building bundle... Simulating...      │    │  │
│  │  │ [14:22:20] [Executor] TX sig: 3X7k9mK...2p ✓ Confirmed     │    │  │
│  │  │ [14:22:21] [RecordTrade] TradeLog PDA created              │    │  │
│  │  │ [14:22:22] [Dashboard] Trade #42 recorded; PnL +520bps      │    │  │
│  │  └──────────────────────────────────────────────────────────────┘    │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────┐    │  │
│  │  │ PnL Dashboard (Recharts Area + Line Chart)                  │    │  │
│  │  │                                                              │    │  │
│  │  │         /──────                                             │    │  │
│  │  │        /          (Cumulative PnL chart)                   │    │  │
│  │  │  ─────/────────                                            │    │  │
│  │  │ $2,100 ──────                                              │    │  │
│  │  │        └──────  (Per-trade edge chart)                     │    │  │
│  │  │                                                              │    │  │
│  │  │ Time: [━━━━━━━━━━━━━━━━━━━━━━━] (last 1 hour)             │    │  │
│  │  │ Total PnL: +$2,100 | Avg Edge: 320bps | Trades: 42        │    │  │
│  │  └──────────────────────────────────────────────────────────────┘    │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────┐    │  │
│  │  │ Trade History Table (Sortable)                              │    │  │
│  │  │                                                              │    │  │
│  │  │ Timestamp│Markets         │Amount │Edge  │Status│Explorer │    │  │
│  │  │─────────────────────────────────────────────────────────────│    │  │
│  │  │14:22:20 │SOL>200 ↔ >210  │0.5 SOL│520bps│✓OK   │[Link]   │    │  │
│  │  │14:21:45 │BTC>100K ↔ >120K│0.3 SOL│320bps│✓OK   │[Link]   │    │  │
│  │  │14:21:10 │ETH>3K ↔ >3.2K  │1.0 SOL│280bps│Pending│[Link]  │    │  │
│  │  │14:20:35 │...             │...    │...   │...    │[Link]   │    │  │
│  │  └──────────────────────────────────────────────────────────────┘    │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────┐    │  │
│  │  │ Risk Settings Panel (FE-03)                                  │    │  │
│  │  │                                                              │    │  │
│  │  │ Max Position Size:      [━━━░░] 20% of vault               │    │  │
│  │  │ Max Drawdown:           [━━░░░░] 5% of initial             │    │  │
│  │  │ Max Slippage:           [150] bps                          │    │  │
│  │  │ Min Edge Threshold:     [300] bps                          │    │  │
│  │  │                                                              │    │  │
│  │  │ [Save Settings] → update_config instruction                 │    │  │
│  │  └──────────────────────────────────────────────────────────────┘    │  │
│  │                                                                         │  │
│  │ Design System:                                                         │  │
│  │ • Color: Dark navy (#0D1F3C) + electric blue (#2A7AE4) + teal       │  │
│  │ • Typography: Inter (Google Fonts) + system sans-serif fallback      │  │
│  │ • Components: shadcn/ui + Recharts + Tailwind CSS                   │  │
│  │ • Accessibility: WCAG 2.1 AA (4.5:1 contrast, keyboard nav)         │  │
│  │ • Mobile: Responsive 12-column grid; breakpoints at 640/1024/1440   │  │
│  │ • Performance: Lighthouse >90; lazy-load charts                      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                       Helius Webhooks│ (on-chain events)
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: DATA (SQLite + Ollama Embeddings)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ SQLite Database (Devnet) / Supabase (Mainnet)                            │  │
│  │                                                                          │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │  │
│  │  │ users table    │  │ trades table   │  │ opportunities  │            │  │
│  │  │                │  │                │  │ table          │            │  │
│  │  │ • user_pubkey  │  │ • trade_id     │  │                │            │  │
│  │  │ • vault_addr   │  │ • user_pubkey  │  │ • opportunity_ │            │  │
│  │  │ • created_at   │  │ • timestamp    │  │   id           │            │  │
│  │  │ • last_active  │  │ • market_a     │  │ • timestamp    │            │  │
│  │  │                │  │ • market_b     │  │ • market_a     │            │  │
│  │  │                │  │ • amount_in    │  │ • market_b     │            │  │
│  │  │                │  │ • amount_out   │  │ • spread_bps   │            │  │
│  │  │                │  │ • edge_bps     │  │ • detection_   │            │  │
│  │  │                │  │ • reasoning_   │  │   class        │            │  │
│  │  │                │  │   hash         │  │ • is_executed  │            │  │
│  │  │                │  │ • tx_signature │  │                │            │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘            │  │
│  │                                                                          │  │
│  │  ┌────────────────────┐  ┌────────────────────────────────────────┐   │  │
│  │  │ agent_logs table   │  │ embeddings table (SQLite-vec)          │   │  │
│  │  │                    │  │                                        │   │  │
│  │  │ • log_id           │  │ • trade_id (FK)                        │   │  │
│  │  │ • timestamp        │  │ • embedding (384-dim BLOB)             │   │  │
│  │  │ • agent_name       │  │ • created_at                           │   │  │
│  │  │ • level (DEBUG/    │  │                                        │   │  │
│  │  │   INFO/WARN/ERROR) │  │ RAG Retrieval:                         │   │  │
│  │  │ • message          │  │ Top-5 similar trades by cosine         │   │  │
│  │  │ • context_json     │  │ similarity (nomic-embed-text model)    │   │  │
│  │  │                    │  │                                        │   │  │
│  │  │ Logging Interval:  │  │ Query performance: <500ms for 10K      │   │  │
│  │  │ Per agent turn     │  │ embeddings                             │   │  │
│  │  └────────────────────┘  └────────────────────────────────────────┘   │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────┐     │  │
│  │  │ Vector Embedding Pipeline (Ollama)                          │     │  │
│  │  │                                                              │     │  │
│  │  │ After each trade recorded:                                  │     │  │
│  │  │   1. Extract reasoning text from agent_logs                 │     │  │
│  │  │   2. Generate 384-dim embedding (nomic-embed-text)          │     │  │
│  │  │      via Ollama: /v1/embeddings                             │     │  │
│  │  │   3. Store in SQLite-vec (embeddings table)                 │     │  │
│  │  │                                                              │     │  │
│  │  │ Before Forecaster scores next opportunity:                  │     │  │
│  │  │   1. Generate embedding of current opportunity text         │     │  │
│  │  │   2. Query SQLite-vec: top-5 similar (cosine > 0.7)         │     │  │
│  │  │   3. Inject into Forecaster system prompt                   │     │  │
│  │  │   4. Enable learning from historical patterns               │     │  │
│  │  └──────────────────────────────────────────────────────────────┘     │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────┐     │  │
│  │  │ Data Migration Path (Devnet → Mainnet)                      │     │  │
│  │  │                                                              │     │  │
│  │  │ Devnet:    SQLite (:memory:) + local Ollama                 │     │  │
│  │  │ Mainnet:   Supabase PostgreSQL + pgvector extension         │     │  │
│  │  │            (drop-in replacement for SQLite-vec)             │     │  │
│  │  │                                                              │     │  │
│  │  │ Schema identical; migrations via Alembic (Python)           │     │  │
│  │  └──────────────────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 5: ORACLE & MEV (Pyth + Jito)                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌───────────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │ Pyth Network (Devnet)             │  │ Jito MEV Protection             │   │
│  │                                   │  │                                  │   │
│  │ • 500+ price feeds                │  │ Bundle Execution:               │   │
│  │   - Crypto: BTC, ETH, SOL, ...    │  │ • Up to 5 TXs atomic execution  │   │
│  │   - Equities: Stock prices         │  │ • All-or-nothing semantics      │   │
│  │   - FX, Commodities: TBD          │  │ • Protects vs. sandwich attacks │   │
│  │ • Confidence intervals             │  │                                │   │
│  │ • Update frequency: ~400ms         │  │ Bundle Submission:             │   │
│  │   (per Solana slot)                │  │ • Jito block engine routing    │   │
│  │ • Pull oracle model (Solana 2024)  │  │ • Dynamic tip calculation      │   │
│  │                                   │  │ • Min tip: 1,000 lamports      │   │
│  │ Usage by Forecaster:              │  │                                │   │
│  │ • Implied probability calculation │  │ Usage by Executor:             │   │
│  │ • Position sizing based on CI     │  │ • All trades wrapped in bundles│   │
│  │ • Correlation analysis            │  │ • Simulation: simulateBundle() │   │
│  │                                   │  │ • Submission: send_jito_bundle()│   │
│  │ Fallback:                         │  │ • Devnet: no actual tips paid  │   │
│  │ Helius DAS API if Pyth down       │  │                                │   │
│  └───────────────────────────────────┘  └──────────────────────────────────┘   │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Trade Execution Data Flow (Detailed)

```
TIME: T+0s
┌─────────────────────────────────────────────────────┐
│ SCOUT AGENT CYCLE                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Fetch Capitola API                              │
│    GET https://capitola.markets/prices             │
│    ◄─── {"markets": [{"id": "SOL>200", ...}]}      │
│                                                     │
│ 2. Fetch Polymarket API                            │
│    GET https://gamma-api.polymarket.com/markets    │
│    ◄─── [{"marketId": "...", "prices": [...]}]    │
│                                                     │
│ 3. Read Hedgehog accounts (Solana-py)              │
│    AsyncClient.get_account_info(hedgehog_market)   │
│    ◄─── Account data parsed to price format        │
│                                                     │
│ 4. Normalize to standard schema                     │
│    {market_id, market_a, market_b, bid, ask, ...}  │
│                                                     │
│ 5. Detect spreads > 300bps                         │
│    SOL>200: Capitola 45% bid / 52% ask             │
│    SOL>210: Polymarket 48% bid / 55% ask           │
│    ─────► Spread: (55-45)/(45) = 22% = 2200bps    │
│                                                     │
│ OUTPUT: RawOpportunity objects                      │
│ [                                                   │
│   {                                                │
│     "market_id": "SOL>200",                        │
│     "market_a": "SOL>200 Capitola",                │
│     "market_b": "SOL>200 Polymarket",              │
│     "bid_a": 0.45,                                 │
│     "ask_a": 0.52,                                 │
│     "bid_b": 0.48,                                 │
│     "ask_b": 0.55,                                 │
│     "spread_bps": 520,                             │
│     "detection_class": "cross_platform_spread",    │
│     "timestamp": 1712000000,                       │
│     "source_a": "capitola",                        │
│     "source_b": "polymarket"                       │
│   }                                                │
│ ]                                                  │
│                                                     │
│ ─► LangGraph state.opportunities updated           │
│ ─► SQLite: INSERT INTO opportunities (...)         │
└─────────────────────────────────────────────────────┘

TIME: T+1s
┌─────────────────────────────────────────────────────┐
│ FORECASTER AGENT CYCLE                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Receive Scout output (RawOpportunity list)      │
│                                                     │
│ 2. RAG Retrieval: Find similar historical trades   │
│    Query SQLite-vec: similarity(current_opp)       │
│    ◄─── Top-5 similar trades by cosine sim         │
│    - Trade #38: SOL>180 cross-platform, edge 420bps│
│    - Trade #35: SOL>190 temporal arb, edge 350bps  │
│    - Trade #32: SOL>200 incoherence, edge 520bps   │
│    - Trade #28: BTC correlated, edge 280bps        │
│    - Trade #25: SOL vol spread, edge 180bps        │
│                                                     │
│ 3. Inject RAG context into system prompt           │
│    "Similar past trades in your cluster: [...]"    │
│                                                     │
│ 4. Apply correlated event detection logic          │
│    Class 1: Probability Incoherence                │
│      SOL>200 + SOL>210 + SOL>220 should sum ~100%  │
│      Actual: 45% + 48% + 42% = 135% (35% arb!)    │
│                                                     │
│    Class 2: Cross-Platform Spread                  │
│      Capitola: 45% bid / 52% ask (7% spread)       │
│      Polymarket: 48% bid / 55% ask (7% spread)     │
│      Diagonal: Buy Capitola 45%, Sell Poly 55%     │
│      Edge: (55-45) / 45 = 22% = 2200bps            │
│                                                     │
│    Class 3: Correlated Asset Divergence            │
│      PM: SOL>200 at 45%                            │
│      Pyth BTC: $95K (implies ~45% for cross-correlation)│
│      Confidence: Pyth CI ±$2K → adjust down        │
│                                                     │
│    Class 4: Temporal Arbitrage                     │
│      July: SOL>200 at 45%                          │
│      December: SOL>200 at 48%                      │
│      Temporal: Dec should be <= July (longer time) │
│      Inconsistency: 48% > 45% → temporal arb!      │
│                                                     │
│ 5. Calculate expected edge (accounting for costs)  │
│    Gross spread: 2200bps                           │
│    Platform take rate: 200bps (Capitola) + 200bps (PM)│
│    Slippage estimate: 100bps (market impact)       │
│    ──────────────────────────────────────────────   │
│    Net edge: 2200 - 200 - 200 - 100 = 1700bps ❌  │
│    (Too conservative; re-estimate)                 │
│                                                     │
│    Alternative (buy Capitola 45%, sell Poly 48%): │
│    Gross: (48-45)/45 * 10000 = 667bps              │
│    Net: 667 - 400 - 100 = 167bps ❌ (below min)   │
│                                                     │
│    Better: Arbitrage incoherence (3-way)           │
│    Buy SOL>210 at 48%, Sell SOL>220 at 42%, etc.   │
│    Expected edge: 300–500bps (more viable)         │
│                                                     │
│ 6. Score opportunity                               │
│    confidence_score = P(edge realized) = 0.85      │
│      (Strong cross-platform evidence, RAG history  │
│       shows 90% realization on similar trades)     │
│                                                     │
│    recommended_size_pct = 0.5% (base) * 0.85       │
│                           * (1 / pyth_CI_width)    │
│                         = 0.425% of vault TVL      │
│                                                     │
│ OUTPUT: ScoredOpportunity                           │
│ {                                                  │
│   "raw_opportunity": {...},                        │
│   "mispricing_class": "multi_class_cluster",       │
│   "edge_estimate_bps": 350,                        │
│   "confidence_score": 0.85,                        │
│   "recommended_size_pct": 0.425,                   │
│   "reasoning": "Cross-platform + temporal incoher.│
│                │ 3 detection classes align. Similar│
│                │ trades #32, #35 realized 480+bps.│
│                │ Pyth CI moderate. Conservative  │
│                │ edge: 350bps post-fees.",        │
│   "pyth_data": {"feed": "SOL/USD", "price": 195,  │
│                 "confidence": 190},               │
│   "similar_trades": [...]                         │
│ }                                                  │
│                                                     │
│ ─► LangGraph state.scored_opps updated             │
│ ─► Top-1 selected for next cycle                   │
└─────────────────────────────────────────────────────┘

TIME: T+3s
┌─────────────────────────────────────────────────────┐
│ COORDINATOR AGENT CYCLE                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Receive Forecaster output (ScoredOpportunity)   │
│                                                     │
│ 2. Check risk controls                             │
│    ✓ Vault paused? NO (is_paused=false)            │
│    ✓ Position size <= 20% TVL?                     │
│      0.425% < 20% ✓ PASS                           │
│    ✓ Drawdown <= 5%?                               │
│      Current drawdown: 0.2% < 5% ✓ PASS            │
│    ✓ Correlation risk <= 0.7?                      │
│      Open positions: {SOL future 1%, BTC future 0%}│
│      Pearson corr(SOL, SOL>200) = 0.95 ⚠️ HIGH!   │
│      ─────► Reduce position: 0.425% * 0.5 = 0.21% │
│    ✓ Confidence >= 0.8?                            │
│      0.85 >= 0.8 ✓ PASS                            │
│                                                     │
│ 3. Approval decision                               │
│    Status: ✓ APPROVED (with position reduction)    │
│    Final size: 0.21% of vault = 21 SOL (if TVL=10K)│
│                                                     │
│ OUTPUT: CoordinatorDecision                         │
│ {                                                  │
│   "approved": true,                                │
│   "trade": {                                       │
│     "opportunity_id": "SOL>200_cross_platform",    │
│     "market_a": "SOL>200 Capitola",                │
│     "market_b": "SOL>200 Polymarket",              │
│     "action_a": "buy",                             │
│     "action_b": "sell",                            │
│     "position_size_pct": 0.21,                     │
│     "position_size_sol": 21.0,                     │
│     "expected_edge_bps": 350,                      │
│     "estimated_pnl_usd": 73.5  # 21*200 * 350/10000│
│   },                                               │
│   "reasoning": "Approved. Position reduced from   │
│                │ 0.425% to 0.21% due to high      │
│                │ correlation (0.95) with existing │
│                │ SOL position. Risk checks pass.  │
│                │ Confidence sufficient.",         │
│   "risk_checks": {                                 │
│     "paused": false,                               │
│     "position_size_ok": true,                      │
│     "drawdown_ok": true,                           │
│     "correlation_adjusted": true,                  │
│     "confidence_ok": true                          │
│   },                                               │
│   "updated_risk_state": {                          │
│     "current_drawdown_pct": 0.2,                   │
│     "open_positions": {"SOL": 21},                 │
│     "paused": false,                               │
│     "last_trade_timestamp": 1712000003             │
│   }                                                │
│ }                                                  │
│                                                     │
│ ─► LangGraph state.approved_trade updated          │
│ ─► Executor ready to proceed                       │
└─────────────────────────────────────────────────────┘

TIME: T+4s
┌─────────────────────────────────────────────────────┐
│ EXECUTOR AGENT CYCLE                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Receive approved trade from Coordinator         │
│                                                     │
│ 2. Build atomic Jito bundle (3 instructions)       │
│    ┌──────────────────────────────────────────┐   │
│    │ Instruction 1: Buy SOL>200 @ Capitola    │   │
│    │ Program: Capitola program (CPI)          │   │
│    │ Accounts: vault, market, shares, ...     │   │
│    │ Data: amount=21 SOL, limit_price=0.45    │   │
│    │ CU estimate: 60,000                      │   │
│    ├──────────────────────────────────────────┤   │
│    │ Instruction 2: Sell @ Polymarket         │   │
│    │ Program: Polymarket program (CPI)        │   │
│    │ Accounts: vault, market, shares, ...     │   │
│    │ Data: amount=21 SOL, limit_price=0.55    │   │
│    │ CU estimate: 60,000                      │   │
│    ├──────────────────────────────────────────┤   │
│    │ Instruction 3: Jito tip (if needed)      │   │
│    │ Program: System Program (Solana)         │   │
│    │ Recipient: Jito tip account              │   │
│    │ Amount: 5,000 lamports (~0.01 SOL)       │   │
│    │ CU estimate: 100                         │   │
│    └──────────────────────────────────────────┘   │
│    Total CU: ~120,100 ✓ (within 1.4M limit)      │
│                                                     │
│ 3. Simulate bundle                                 │
│    jito-py: simulateBundle(bundle)                │
│    Response:                                       │
│    {                                              │
│      "success": true,                             │
│      "cu_used": 118,400,                          │
│      "filled_prices": {                           │
│        "instruction_1_fill": 0.445,  # vs 0.45    │
│        "instruction_2_fill": 0.548   # vs 0.55    │
│      },                                           │
│      "error": null                                │
│    }                                              │
│                                                     │
│    Calculate slippage:                            │
│    Slippage leg 1: (0.445 - 0.45) / 0.45 = -1.1% │
│    Slippage leg 2: (0.548 - 0.55) / 0.55 = -0.4% │
│    Avg slippage: -0.75% = -75bps                  │
│    ─────► Within max 150bps ✓ PASS                │
│                                                     │
│    Recalculate edge post-slippage:                │
│    Gross edge: 350bps                             │
│    Slippage loss: -75bps                          │
│    Net edge: 275bps ✓ ACCEPTABLE                  │
│                                                     │
│ 4. Submit bundle to Jito                          │
│    jito-py: send_jito_bundle(bundle, tip=5000)    │
│    Response: tx_signature = "3X7k9mK...2p"        │
│                                                     │
│ 5. Poll transaction status                        │
│    Slot 1: Pending (not yet in confirmed block)   │
│    Slot 2: Confirmed! ✓                           │
│    Result:                                        │
│    {                                              │
│      "tx_signature": "3X7k9mK...2p",              │
│      "success": true,                             │
│      "cu_used": 119,200,                          │
│      "filled_prices": {                           │
│        "leg_1": 0.4455,                           │
│        "leg_2": 0.5475                            │
│      },                                           │
│      "timestamp": 1712000004                      │
│    }                                              │
│                                                     │
│ 6. Calculate actual PnL                           │
│    Leg 1: Buy 21 SOL @ 0.4455 (implied prob)      │
│    Leg 2: Sell 21 SOL @ 0.5475 (implied prob)     │
│    Delta in probs: 0.5475 - 0.4455 = 0.102 = 10.2%│
│    Actual edge: 10.2% = 1020bps ❌ (better than forecast!)│
│                                                     │
│    Platform fees: 200+200 = 400bps                 │
│    Net edge: 1020 - 400 = 620bps                  │
│    PnL: 21 SOL * 200 USD/SOL * (620/10000)        │
│         = 21 * 200 * 0.062 = $260.4               │
│                                                     │
│ 7. Call record_trade instruction                  │
│    Program call: record_trade                     │
│    Accounts: agent_wallet, trade_log_pda, vault   │
│    Data:                                          │
│    {                                              │
│      "trade_id": 43,                              │
│      "timestamp": 1712000004,                      │
│      "market_a": "SOL>200 Capitola",              │
│      "market_b": "SOL>200 Polymarket",            │
│      "amount_in": 21000000000 (21 SOL in lamports)│
│      "amount_out": 21604000000 (realized fill)    │
│      "edge_bps": 620,                             │
│      "reasoning_hash": sha256(agent_logs_text)    │
│    }                                              │
│    ─────► Creates TradeLog PDA #43 on-chain      │
│                                                     │
│ OUTPUT: ExecutionResult                            │
│ {                                                  │
│   "success": true,                                │
│   "tx_signature": "3X7k9mK...2p",                │
│   "filled_price_a": 0.4455,                      │
│   "filled_price_b": 0.5475,                      │
│   "actual_edge_bps": 620,                        │
│   "slippage_bps": -75,                           │
│   "cu_used": 119200,                             │
│   "timestamp": 1712000004,                       │
│   "error_message": null                          │
│ }                                                 │
│                                                     │
│ ─► LangGraph state.execution_result updated       │
│ ─► TradeLog PDA #43 now immutable on-chain        │
└─────────────────────────────────────────────────────┘

TIME: T+5s
┌─────────────────────────────────────────────────────┐
│ HELIUS WEBHOOK NOTIFICATION                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ TradeLog PDA #43 creation detected                 │
│ ─────► Helius webhook fires                        │
│ POST /api/webhooks/trades                          │
│ Body:                                              │
│ {                                                  │
│   "type": "account_change",                        │
│   "account": "trade_log_pda_#43",                  │
│   "data": {...},  # Full TradeLog data             │
│   "slot": 123456                                  │
│ }                                                  │
│                                                     │
│ ─► Next.js API route receives webhook              │
│ ─► Broadcasts to WebSocket subscribers             │
│ {                                                  │
│   "type": "trade_executed",                        │
│   "data": {                                        │
│     "trade_id": 43,                               │
│     "markets": "SOL>200 Capitola ↔ Polymarket",   │
│     "amount": 21,                                 │
│     "edge_bps": 620,                              │
│     "pnl": 260.4,                                 │
│     "tx_signature": "3X7k9mK...2p"                │
│   }                                                │
│ }                                                  │
└─────────────────────────────────────────────────────┘

TIME: T+6s
┌─────────────────────────────────────────────────────┐
│ FRONTEND DASHBOARD UPDATE (WebSocket)               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ React component receives WebSocket message         │
│ useAgentStream hook processes:                     │
│   - Add trade to trade history table               │
│   - Update PnL chart: new point (+$260.4)          │
│   - Refresh cumulative PnL: $2,100 → $2,360       │
│   - Append to agent reasoning log:                 │
│     "[14:22:21] [Executor] TX 3X7k9mK...2p ✓      │
│      Confirmed. Edge: 620bps. PnL: +$260.4"       │
│   - Update trade count: 42 → 43                    │
│   - Refresh average edge: 300bps → 310bps          │
│                                                     │
│ USER SEES IN DASHBOARD:                            │
│ ┌─────────────────────────────────────────────┐   │
│ │ Trade #43: SOL>200 ↔ Polymarket              │   │
│ │ Amount: 21 SOL | Edge: 620bps | Status: ✓OK │   │
│ │ [View in Explorer] ────► Solana Explorer     │   │
│ │                                               │   │
│ │ PnL Chart: +$260 bar added                   │   │
│ │ Cumulative: $2,100 → $2,360 (new high)       │   │
│ │ Trades: 42 → 43                              │   │
│ │ Avg Edge: 300bps → 310bps                    │   │
│ │ Avg APY (annualized): 12.4%                  │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ─► Dashboard fully updated within <500ms           │
│ ─► Audit trail complete: on-chain + off-chain     │
└─────────────────────────────────────────────────────┘

TIME: T+30s
┌─────────────────────────────────────────────────────┐
│ NEXT SCOUT CYCLE (Loop repeats every 10–30s)       │
├─────────────────────────────────────────────────────┤
│                                                     │
│ LangGraph StateGraph checkpoints current state     │
│ (Enables pause/resume & time-travel debugging)     │
│                                                     │
│ Next Scout polling begins...                       │
└─────────────────────────────────────────────────────┘
```

---

## Risk Circuit Breaker Flow

```
┌─────────────────────────────────────────────────────┐
│ CIRCUIT BREAKER TRIGGER SEQUENCE                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Scenario: Vault drawdown exceeds 5% threshold      │
│                                                     │
│ Trade #40: Edge estimate 450bps, confidence 0.92   │
│ Trade #41: FAILED (market crash, 0% edge)          │
│ Trade #42: FAILED (correlated event, -150bps loss) │
│ ─────────────────────────────────────────────      │
│ Cumulative loss: -150bps = -$30 on $10K vault      │
│ Drawdown: -$30 / $10K = -0.3% ✓ Still OK           │
│                                                     │
│ Trade #43: Edge 350bps (normal)                    │
│ Trade #44: FAILED (slippage exceeded, -200bps)     │
│ Trade #45: FAILED (market liquidity, -180bps)      │
│ ─────────────────────────────────────────────      │
│ Cumulative loss: -150 - 200 - 180 = -530bps        │
│ Loss: $530 / $10K = 5.3% drawdown                  │
│ ─────► EXCEEDS 5% THRESHOLD ⚠️                      │
│                                                     │
│ Coordinator detects in next cycle:                 │
│   check_vault_drawdown() returns 0.053 (5.3%)      │
│   if drawdown > max_drawdown_bps (500):             │
│     ─────► trigger_circuit_breaker()               │
│                                                     │
│ Circuit Breaker Action:                            │
│   Call emergency_pause instruction                 │
│   ─────► vault.is_paused = true                    │
│                                                     │
│ Consequences:                                      │
│   ✓ Scout can still fetch prices (no pause)        │
│   ✓ Forecaster can still score (no pause)          │
│   ✓ Coordinator can still validate (no pause)      │
│   ✗ Executor CANNOT call execute_arb (paused)      │
│   ✓ User CAN call withdraw (always available)      │
│                                                     │
│ User Notification:                                 │
│ Frontend displays:                                 │
│ ┌─────────────────────────────────────────────┐   │
│ │ ⚠️ AGENTS PAUSED                            │   │
│ │ Drawdown exceeded: 5.3% > 5.0% threshold    │   │
│ │ Max loss triggered circuit breaker          │   │
│ │                                              │   │
│ │ Your funds are safe.                        │   │
│ │ [Resume Agents] [Withdraw] [View Trades]    │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ User can:                                          │
│   1. Review agent logs to understand losses        │
│   2. Adjust risk parameters (lower max_drawdown)   │
│   3. Resume agents if confident                    │
│   4. Withdraw principal + accrued gains            │
│                                                     │
│ ─────► System protected; no further trading        │
└─────────────────────────────────────────────────────┘
```

---

## Component Interaction Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│ COMPONENT INTERACTIONS (Who talks to whom?)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SMART CONTRACT ↔ AGENTS:                                          │
│  ├─ initialize_vault ◄─── FE wallet connect ◄─── User action      │
│  ├─ deposit ◄─────────── FE deposit modal ◄──── User input         │
│  ├─ withdraw ◄──────────── FE withdraw modal ◄─── User input       │
│  ├─ execute_arb ◄────────── Executor (LangGraph) ◄─ Coordinator ok │
│  ├─ record_trade ◄────────── Executor (LangGraph) ◄─ TX confirmed  │
│  ├─ emergency_pause ◄──────── Coordinator (circuit breaker) or User│
│  │                          OR FE pause button                     │
│  │                                                                 │
│  AGENTS ↔ DATA LAYER:                                             │
│  ├─ Scout ─────► Fetch prices from APIs (Capitola, Polymarket)    │
│  ├─ Scout ─────► Store opportunities in SQLite                    │
│  ├─ Forecaster ──► Query SQLite-vec for similar historical trades │
│  ├─ Forecaster ──► Pyth oracle for confidence intervals           │
│  ├─ Forecaster ──► Query Pyth network for price feeds             │
│  ├─ Coordinator ─► Query vault state (drawdown calculation)       │
│  ├─ Executor ────► Record trade results in SQLite                 │
│  ├─ Executor ────► Generate embeddings for new trades             │
│  │                                                                 │
│  AGENTS ↔ EXTERNAL APIS:                                          │
│  ├─ Scout ──────► Capitola API (prices)                           │
│  ├─ Scout ──────► Polymarket REST API (prices)                    │
│  ├─ Scout ──────► Hedgehog devnet accounts (Solana-py)            │
│  ├─ Scout ──────► Pyth devnet feeds                               │
│  ├─ Executor ────► Helius RPC (TX submission)                     │
│  ├─ Executor ────► Jito block engine (bundle submission)          │
│  │                                                                 │
│  FRONTEND ↔ SMART CONTRACT:                                       │
│  ├─ Wallet Connect ──► Phantom/Solflare (signer)                  │
│  ├─ Deposit Modal ────► initialize_vault + deposit instructions   │
│  ├─ Withdraw Modal ───► withdraw instruction                      │
│  ├─ Pause Button ─────► emergency_pause instruction               │
│  ├─ Settings Panel ───► update_config instruction                 │
│  ├─ Dashboard ────────► Helius WebSocket (vault account changes)  │
│  │                                                                 │
│  FRONTEND ↔ BACKEND:                                              │
│  ├─ WebSocket ────────► /ws/agents (real-time logs + trades)      │
│  ├─ REST Polling ─────► /api/trades (fallback)                    │
│  ├─ REST Polling ─────► /api/opportunities (fallback)             │
│  ├─ REST Polling ─────► /api/agent-status (fallback)              │
│  │                                                                 │
│  BACKEND ↔ BLOCKCHAIN:                                            │
│  ├─ Helius Webhooks ──► On-chain event notifications              │
│  │                      (vault deposit, TradeLog creation)         │
│  │                                                                 │
│  BACKEND ↔ LLM:                                                   │
│  ├─ Scout ──────────────► Ollama API (JSON output)                │
│  ├─ Forecaster ─────────► Ollama API (chain-of-thought reasoning) │
│  ├─ Coordinator ────────► Ollama API (risk validation)            │
│  ├─ Executor ──────────► Ollama API (fast decisions)              │
│  │                                                                 │
│  BACKEND ↔ OBSERVABILITY:                                         │
│  ├─ LangGraph ─────────► LangSmith (agent tracing)                │
│  ├─ Backend logs ──────► SQLite agent_logs table                  │
│  ├─ Backend logs ──────► Python logger (stdout)                   │
│  │                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Document prepared for Hackathon | April 14, 2026**

This architecture is designed for **maximum transparency** (judges see agent reasoning in real time), **zero operational cost** (Ollama local, Helius free, Vercel free), and **production-grade reliability** (Jito bundles, on-chain risk enforcement, circuit breakers).
