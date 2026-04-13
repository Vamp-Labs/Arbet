⚡  Arbet AGENTS
Autonomous AI Agent Swarm for Prediction Market Arbitrage
 
PRD v2.0  |  April 2026  |  Hackathon-Ready Zero-Cost Devnet MVP

Field	Value
Document Version	2.0 — Comprehensive Edition
Status	DRAFT — Hackathon Submission Ready
Author(s)	Arbet Agents Core Team
Last Updated	April 12, 2026
Target Delivery	14-Day Devnet MVP (Week 2, April 2026)
Network	Solana Devnet (All costs $0)
Classification	Confidential — Internal + Judges

1. Executive Summary
Arbet Agents is a fully autonomous, multi-agent AI swarm designed to continuously scan Solana-native and integrated prediction markets, detect mispricings and correlated inconsistencies in real time, and execute risk-adjusted arbitrage trades without human intervention. Users deposit SOL or USDC into a non-custodial on-chain vault; the swarm generates yield 24/7 from structural market fragmentation.

The project represents a fundamental upgrade over single-agent bots and rule-based scripts: it introduces correlated-event arbitrage logic — exploiting mathematical inconsistencies between related markets — as a first-class primitive on Solana. The entire MVP is built exclusively on free and open-source infrastructure, with zero paid API dependencies.

1.1 Value Proposition
    • First-of-its-kind correlated mispricing detection across Capitola, Polymarket (via Capitola bridge), Hedgehog Markets, and Drift BET on Solana Devnet
    • Fully autonomous 4-agent swarm (Scout → Forecaster → Executor → Coordinator) with LangGraph stateful orchestration and LangSmith observability
    • Zero operational cost during hackathon: local Ollama LLM (Qwen3-8B / Llama 3.3 models), public Solana Devnet RPC, Helius free tier (1M credits), Pyth devnet oracle
    • Transparent agent reasoning log visible in real-time dashboard — judges see the AI 'think', giving undeniable demo wow-factor
    • Built on production-grade stack: Anchor v1.0.0 (released April 2026), SPL Token-2022, solana-py + solders, Next.js on Vercel free tier

1.2 Top-Line Targets
Metric	Devnet MVP (Week 2)	Mainnet Beta (Month 3)	Year 1 Target
TVL	$0 (demo deposits)	$500K	$10M+
Daily Active Users (DAU)	5–10 (team + judges)	500	5,000+
Agent Execution Volume	50 simulated trades/day	$100K/day	$5M+/day
Markets Monitored	3 platforms (Capitola, Polymarket, Hedgehog)	8 platforms	20+ platforms
Avg. Edge Captured per Trade	Simulated: 2–8%	>2% net of fees	>1.5% net of fees
Agent Tx Success Rate	>95% (devnet)	>98%	>99.5%


2. Problem Statement & Market Opportunity
2.1 Core Problems
#	Problem	Impact	Root Cause
P1	Fragmented liquidity & mispricings on identical events across aggregators/platforms	Critical	No real-time cross-platform normalisation layer
P2	Correlated market inconsistencies (e.g. election outcomes whose probabilities don't sum correctly) go unexploited for hours	Critical	Requires multi-market statistical reasoning beyond human capacity
P3	Human & simple-bot latency — edges vanish in seconds on Solana's 400ms block times	High	Solana processes ~4,000 TPS; manual or rule-based systems cannot compete
P4	No autonomous yield layer for prediction markets — capital sits idle or requires active manual trading	High	No infrastructure exists to automate prediction market yield strategies
P5	High execution risk (slippage, failed txs, MEV exposure) for retail users without smart tooling	Medium	No agent-level risk simulation or circuit-breaker infrastructure for PMs

2.2 Market Opportunity
    • Polymarket is the world's largest prediction market platform with 1,918 active Solana-related markets as of April 2026, driving hundreds of millions in annual volume
    • Total addressable prediction market volume exceeds $3B+ annually across chains; Solana captures increasing share due to sub-cent fees (~$0.0002/tx) and 400ms finality
    • Solana DeFi TVL stands at $5.8B+ (April 2026); prediction markets are an emerging yield category within that ecosystem
    • Pyth Network — now the official oracle for Polymarket's new stock and commodity contracts (integration announced April 3, 2026) — provides 380+ price feeds across crypto, equities, FX, and commodities, unlocking arbitrage between traditional finance and prediction markets
    • No competing product currently offers autonomous multi-agent correlated arbitrage across Solana-native prediction markets — the category is genuinely uncontested

2.3 Competitive Landscape
Competitor	Approach	Limitations vs. Arbet
Rule-based bots (Mango, Drift algos)	Static spread thresholds, single-market	No correlation logic, no AI reasoning, no swarm coordination
Polymarket API scrapers	Off-chain price monitoring only	No execution engine, no Solana-native integration, no vault
DeFi yield aggregators (Tulip, Kamino)	LP / lending strategies	No prediction market support, no autonomous AI agents
Manual traders	Human judgment	Cannot react at sub-second speed; cannot simultaneously monitor 100+ markets
Arbet Agents (this project)	AI swarm + correlated arbitrage + on-chain vault	First-mover advantage; zero competitors in category


3. Technology Stack — Deep Technical Reference
All technologies below are confirmed current as of April 2026. Version numbers, API features, and pricing tiers reflect live documentation research.

3.1 Blockchain Infrastructure
3.1.1 Solana Runtime — Agave Client
    • Solana CLI v3.0.10 / Agave client (the successor to the original Solana Labs validator client, rebranded as part of the Agave transition)
    • Solana Devnet: Public endpoint https://api.devnet.solana.com — no authentication required, free SOL via airdrop (2 SOL/request cap), suitable for all MVP development
    • Block time: ~400ms. TPS capacity: 4,000+ sustained, 65,000+ theoretical. Finality: ~2.5 seconds (optimistic confirmation ~1 slot)
    • Compute Units (CU): Each transaction has a max budget of 1,400,000 CU. Arbet programs target <120,000 CU/tx to minimise priority fee requirements
    • QUIC protocol replaces UDP for transaction submission; staked connections (via Helius) receive preferential processing during congestion

3.1.2 Anchor Framework v1.0.0
    • Anchor v1.0.0 was released April 2, 2026 — the first production-stable major version after years in 0.x. This is the definitive framework for Solana smart contract development.
    • Key v1.0.0 changes relevant to Arbet: (1) solana-program crate replaced by smaller, composable crates reducing binary size; (2) anchor deploy now uploads IDL to cluster by default; (3) solana-verify integration for on-chain program verification; (4) Rust eDSL macros fully stabilised
    • Installation via Anchor Version Manager (AVM): avm install 1.0.0 && avm use 1.0.0
    • Rust compiler requirement: rustc 1.85.0+ (MSRV explicitly set in generated templates)
    • IDL generation: anchor idl build produces JSON IDL consumed by TypeScript and Python clients for type-safe CPI calls
    • Security: Anchor's constraint system (#[account(...)]) enforces signer checks, PDA seeds, and ownership validation at compile time — reducing common vulnerabilities

3.1.3 SPL Token-2022 (Token Extensions)
    • The vault share token uses SPL Token-2022, Solana's next-generation token standard supporting programmable transfer logic
    • Extensions used in Arbet MVP: Metadata Pointer (on-chain vault share name/symbol/URI), Transfer Hook (future: performance fee on yield withdrawal)
    • Token-2022 is production-deployed on Solana mainnet and fully supported on devnet — no devnet-specific compatibility issues
    • Vault shares (ARBT-[user]) are minted proportional to deposit; burnt on withdrawal; price determined by vault NAV

3.1.4 Helius — Solana Infrastructure Provider
    • Helius is Solana's leading RPC and API platform as of 2026, processing billions of daily requests with 99.99% uptime across a globally distributed network
    • Free tier: 1,000,000 credits/month, no credit card required — sufficient for all MVP development and hackathon demos
    • Key features used by Arbet: Enhanced WebSocket subscriptions (real-time program account changes), Webhook API (notify backend on vault deposit/withdrawal events), DAS API (Digital Asset Standard — query Token-2022 vault share metadata), Transaction Parsing API (human-readable event logs for agent reasoning dashboard)
    • LaserStream: Helius's gRPC-based ultra-low-latency data stream — available on paid tiers for post-hackathon mainnet deployment; simulated in MVP
    • Staked connections: Helius RPC traffic routes through staked validator nodes, receiving higher priority during congestion — critical for mainnet arbitrage execution
    • Average RPC latency: ~140ms via Helius vs ~400–600ms via public endpoint — significant advantage for time-sensitive arbitrage

3.1.5 Jito MEV Infrastructure
    • Jito Labs operates the dominant MEV protection and bundle execution layer on Solana as of 2026, processing approximately two-thirds of all Solana fee revenue via Jito tips
    • Bundles: Groups of up to 5 transactions executed sequentially and atomically (all-or-nothing). Critical for Arbet's buy-low/hedge-high synthetic arbitrage — ensures both legs of the trade either land together or not at all
    • Tip mechanics: Minimum tip = 1,000 lamports. Arbet uses dynamic tip calculation via jito-py SDK based on current tip pricing in the block engine. Higher tips incentivise validators to prioritise bundle inclusion
    • Devnet simulation: jito-solana RPC supports simulateBundle for pre-flight validation. Arbet uses this for all simulated trades in the MVP — zero actual tips paid on devnet
    • Python SDK: jito-py provides a JSON-RPC library for bundle submission directly from the Python agent backend
    • MEV protection: Arbet's own transactions are protected from sandwich attacks by submitting through Jito bundles — the Executor agent wraps all trades in bundles

3.1.6 Pyth Network Oracle
    • Pyth Network is the largest first-party oracle on Solana, providing 380+ price feeds covering cryptocurrencies, equities, ETFs, FX pairs, and commodities — updated every ~400ms (every Solana slot)
    • Pull oracle model (post-2024): Unlike traditional push oracles, Pyth's Solana integration uses Pythnet (a separate Solana-based chain) to aggregate prices, which are then pulled on-chain by consuming programs when needed — reducing gas costs during congestion
    • Critical April 2026 update: Pyth Pro is now the official oracle for Polymarket's new stock and commodity prediction markets (announced April 3, 2026), creating a direct data bridge between prediction market probabilities and underlying asset prices — enabling a new class of cross-asset arbitrage
    • Devnet: Full Pyth price feed support on Solana Devnet; feed addresses available at Pyth's documented devnet registry
    • Confidence intervals: Pyth provides not just prices but confidence intervals — Arbet's Forecaster agent uses these to adjust position sizing (wider confidence = smaller position)

3.2 AI & Agent Layer
3.2.1 Ollama — Local LLM Runtime
    • Ollama v0.18+ is the production standard for local LLM deployment in 2026, with 52 million monthly downloads and support for 135,000+ GGUF models on HuggingFace
    • Ollama exposes an OpenAI-compatible HTTP API (http://localhost:11434/api/), enabling drop-in replacement of cloud API calls — zero code changes needed if transitioning from OpenAI/Anthropic
    • Performance on developer hardware (2026 benchmarks): Qwen3-8B runs at 40–60 tokens/sec on 16GB RAM laptops (CPU-only); 80–120 tokens/sec with RTX 4060 (8GB VRAM); Apple M-series achieves 50–80 tokens/sec via MLX acceleration
    • Quantization: Q4_K_M quantization recommended — achieves 25–30% of original model size with <5% quality degradation. Qwen3-8B at Q4_K_M requires ~6GB RAM

3.2.2 Model Selection — Qwen3-8B Primary / DeepSeek R1 14B Fallback
Model	Params	RAM Req.	HumanEval	Use Case in Arbet	Ollama Pull
Qwen3-8B (Primary)	8B	~6GB	76.0% (highest <8B)	Scout & Coordinator reasoning, structured JSON output	ollama pull qwen3:8b
DeepSeek R1 14B (Fallback)	14B	~10GB	Chain-of-thought leader	Forecaster: complex correlated event analysis	ollama pull deepseek-r1:14b
Phi-4 3.8B (Lightweight)	3.8B	~3GB	84.8% MMLU at 14B class	Low-latency Executor pre-checks on limited hardware	ollama pull phi4:3.8b
Llama 3.3 70B (High-end)	70B	~48GB	GPT-4 class	Optional: High-value correlated cluster analysis (Mac Studio M4)	ollama pull llama3.3:70b

Primary recommendation for hackathon judges with standard hardware: Qwen3-8B at Q4_K_M. Achieves 76.0% HumanEval — the highest score of any model under 8B parameters — and delivers structured JSON output required by LangGraph with high reliability. Dual-mode operation (Thinking for complex reasoning, Non-thinking for fast responses) controlled via system prompt.

3.2.3 LangGraph — Multi-Agent Orchestration
    • LangGraph is an open-source Python library (built on LangChain) that models multi-agent workflows as directed cyclic graphs — nodes (agents/tools) connected by edges (decisions/transitions). It is the leading stateful agent framework in 2026 with 27,100 monthly searches, ahead of all alternatives.
    • Core capability: Unlike linear chains (A→B→C), LangGraph supports loops, conditional branching, parallel agent execution, and shared persistent state — all required by Arbet's swarm architecture
    • State management: All 4 agents share a centralised TypedDict state object containing market data, opportunity scores, risk parameters, execution history, and reasoning logs. Every state transition is checkpointed to SQLite (devnet) or Supabase (mainnet)
    • Checkpointing enables: Time-travel debugging (replay agent decisions), human-in-the-loop approval (pause graph, await user confirmation, resume), and mid-execution failure recovery without losing context
    • LangSmith integration: LangGraph integrates natively with LangSmith for tracing every agent call, tool use, and state mutation — providing the observable 'agent thought process' displayed in the dashboard reasoning log
    • 2026 features: LangGraph Cloud (hosted execution with built-in monitoring), dynamic sub-agent spawning (Coordinator can spawn additional Scout agents for high-priority event clusters), and native A2A protocol support for inter-framework agent communication

3.3 Solana Development SDKs
3.3.1 solana-py + solders
    • solana-py: Python SDK for Solana providing AsyncClient for account reads, WebSocket subscriptions for real-time program account changes, transaction building and signing, and RPC method wrappers
    • solders: Rust-backed Python bindings providing high-performance serialization/deserialization of Solana primitives. Used for: Keypair generation, PublicKey operations, Instruction building, Transaction serialization, and Blockhash management
    • Together, solana-py and solders replace the need for any Node.js in the agent backend — the full agent loop runs in pure Python
    • Key agent actions: AsyncClient.get_account_info() for vault balance, AsyncClient.send_transaction() for trade execution, WebSocket.account_subscribe() for real-time vault events

3.4 Frontend Stack
3.4.1 Next.js 15 + Vercel
    • Next.js 15 (App Router): Server and client components, API routes for agent communication, WebSocket proxy for real-time dashboard updates
    • Vercel free tier: Unlimited bandwidth, 100GB-hours serverless functions/month, automatic HTTPS — zero cost for hackathon deployment
    • @solana/wallet-adapter-react v0.19+: Supports Phantom, Solflare, Backpack, and all major Solana wallets. Mobile-responsive for in-app browser support
    • shadcn/ui + Tailwind CSS: Component library for professional UI without custom CSS overhead
    • Recharts: React chart library for PnL visualisation, opportunity feed, and agent performance graphs

3.5 Data & Storage
3.5.1 Off-Chain Database
    • SQLite (devnet MVP): Single-file database, zero configuration, Python sqlite3 built-in. Tables: users, trades, agent_logs, opportunities, vector_embeddings
    • Vector embeddings for RAG: SQLite-vec (SQLite extension) stores 384-dimension embeddings of past trade decisions. Ollama's nomic-embed-text model generates embeddings locally — zero cost
    • Supabase free tier (mainnet): 500MB storage, 2GB bandwidth, real-time subscriptions via PostgreSQL NOTIFY/LISTEN — direct upgrade path from SQLite
3.5.2 External Data Sources
    • Capitola public API: Best-price aggregation across Solana prediction markets — the core data source for cross-platform spread detection
    • Polymarket public REST API: https://gamma-api.polymarket.com/markets — returns market data, prices, and liquidity. No authentication required. Rate limit: ~10 req/sec
    • Hedgehog Markets devnet: Solana-native prediction market with devnet deployment — used for simulated on-chain trade execution via CPI
    • Pyth devnet price feeds: 500+ price feeds available on Solana Devnet. Used by Forecaster agent to correlate prediction market probabilities with underlying asset prices


4. Target Audience & User Personas
4.1 Persona 1 — The Whale Hunter
Attribute	Detail
Profile	High-net-worth crypto native, $50K–$500K portfolio, advanced Solana power user
Primary Goal	Maximise risk-adjusted yield from prediction market alpha; full autonomy with granular risk controls
Tools Used	Phantom wallet, Dune Analytics, Jupiter aggregator, custom Python scripts
Pain Points	Manually monitoring 50+ markets is impossible; simple bots miss correlated opportunities; execution risk on large positions
Arbet Value Prop	Autonomous swarm handles 100+ markets simultaneously; correlated arbitrage captures edges invisible to single-market bots; on-chain circuit breaker limits drawdown
Risk Tolerance	High — comfortable with up to 10% drawdown per agent cycle
Decision Trigger	Sees >5% annualised yield improvement vs. manual strategy in backtest

4.2 Persona 2 — The Explorer
Attribute	Detail
Profile	Retail DeFi user, $500–$5K portfolio, moderate Solana familiarity, mobile-first (Phantom iOS)
Primary Goal	Passive yield with minimal effort — 'set and forget' experience
Tools Used	Phantom mobile, Raydium, Jupiter, Twitter/X for alpha
Pain Points	Too intimidated by manual trading; loses to bots; doesn't understand prediction market mechanics
Arbet Value Prop	One-click deposit into vault; agents handle everything; clear PnL dashboard shows earnings daily
Risk Tolerance	Low — wants principal protection; max 5% drawdown threshold
Decision Trigger	Positive word-of-mouth from crypto Twitter; sees >12% APY in dashboard demo

4.3 Persona 3 — The Banker
Attribute	Detail
Profile	Institutional-minded yield farmer, $10K–$100K in LSTs/stablecoins, high Solana familiarity
Primary Goal	Delta-neutral strategies with quantifiable risk metrics and transparent PnL accounting
Tools Used	Kamino Finance, Drift Protocol, Excel PnL tracking, on-chain analytics
Pain Points	Existing yield sources (LST staking, LP fees) are correlated with market direction; needs uncorrelated alpha
Arbet Value Prop	Synthetic arbitrage is market-direction neutral; on-chain trade log provides auditable PnL; risk parameter controls enforce delta-neutrality
Risk Tolerance	Low-Medium — prioritises Sharpe ratio over raw returns; requires max drawdown < 8%
Decision Trigger	Reviews on-chain trade history; validates agent reasoning logs are sound; confirms exit liquidity

5. User Stories
  Priority 0 — Must Have (MVP Scope)

ID	Story	Acceptance Criteria	Persona
US-01	As a user, I want to connect my Phantom/Solflare wallet and deposit SOL/USDC into the Arbet Vault so agents can trade with my capital	Wallet connects in <3s; PDA vault created on-chain; deposit confirmed in <2 Solana slots; dashboard reflects new balance	All
US-02	As a user, I want to view live mispricing opportunities and agent swarm status on a real-time dashboard	Opportunities update every 5–10s; each agent shows status (idle/scanning/executing); latency indicator visible	All
US-03	As a user, I want agents to automatically detect and execute arbitrage on correlated events without my manual intervention	Agent initiates trade within 8s of opportunity detection; both legs execute atomically; PnL recorded on-chain	Whale Hunter, Banker
US-04	As a user, I want to withdraw my principal plus accrued profits at any time	Withdrawal tx confirms in <5s; correct proportion of vault shares burnt; full exit available within 1 epoch	All
US-05	As a judge reviewing the demo, I want to see the agent 'thinking' in real-time so I can evaluate AI reasoning quality	Reasoning log updates per agent turn; shows market data ingested, opportunity scored, decision made, tx result	N/A (Judge UX)

  Priority 1 — High Value (MVP Stretch)

ID	Story	Acceptance Criteria	Persona
US-06	As a user, I want to set risk parameters (max position size, max drawdown, slippage tolerance)	Parameters persist on-chain in global config PDA; agents respect limits on every execution cycle	Whale Hunter, Banker
US-07	As a user, I want real-time PnL and full trade history with agent decision trace per trade	Recharts PnL chart updates per trade; trade table shows timestamp, markets, amounts, edge captured, agent reasoning	All
US-08	As a user, I want to pause all agents immediately if I see unexpected behavior	Pause button triggers emergency_pause ix within 1 slot; no new trades initiated until user resumes	All
US-09	As a user, I want correlated event probability graphs so I can understand why agents are trading	Visual shows two related market probabilities over time; highlights when mathematical inconsistency exceeds threshold	Whale Hunter, Banker

  Priority 2 — Future (Post-Hackathon)

    • US-10: Custom agent swarm deployment on a specific event cluster (e.g. only US politics)
    • US-11: Agent performance leaderboard across multiple user vaults
    • US-12: Email/Telegram notifications for significant trades or drawdown alerts
    • US-13: CSV export of full trade history for tax reporting
    • US-14: Multi-vault strategy selection (Conservative / Aggressive / Delta-Neutral)
    • US-15: Referral system — share vault address, earn % of referral's yield


6. AI Agent Architecture — Deep Specification
6.1 Agent Swarm Overview
The Arbet swarm consists of four specialised agents coordinated by a LangGraph StateGraph. Each agent is a node in the graph with defined inputs, outputs, and tool access. The graph runs in a continuous loop (every 10–30 seconds in MVP, every 1–5 seconds post-hackathon).

Agent	Role	LLM	Tools	Output
Scout	Market surveillance — continuously polls all prediction platforms for price/probability data; normalises formats; detects raw spreads above minimum threshold (configurable, default 3%)	Qwen3-8B (non-thinking mode for speed)	fetch_capitola_prices(), fetch_polymarket_api(), read_hedgehog_accounts(), query_pyth_feeds()	JSON: list of raw opportunities with platform, market_id, bid, ask, spread_bps
Forecaster	Opportunity scoring — receives Scout output; applies correlated event logic; scores each opportunity by expected edge (accounting for slippage, fees, confidence interval); filters to top-N by risk-adjusted score	DeepSeek R1 14B (chain-of-thought reasoning) or Qwen3-8B thinking mode	pyth_confidence_check(), historical_edge_lookup() via RAG, correlation_matrix_compute()	JSON: ranked list of scored opportunities with edge estimate, confidence, recommended position size
Executor	Trade construction — builds Solana transactions for approved opportunities; simulates via simulateTransaction / simulateBundle; executes via Jito bundle or direct RPC; records result	Qwen3-8B (non-thinking for speed)	build_buy_instruction(), build_sell_instruction(), simulate_bundle_jito(), send_jito_bundle(), record_trade_pda()	JSON: tx_signature, actual_edge, slippage, CU_used, success/fail status
Coordinator	Risk governance — enforces global risk rules; approves/vetoes Executor's proposed trades; manages circuit breaker; aggregates agent reasoning for dashboard log	Qwen3-8B (non-thinking)	check_vault_drawdown(), validate_position_size(), check_correlation_risk(), trigger_circuit_breaker()	JSON: approved/vetoed decision with reasoning; updated risk state

6.2 LangGraph State Schema
The shared state TypedDict passed between all agents at every graph step:

State Fields	market_snapshot: dict (latest prices from all platforms) opportunities: list[Opportunity] (Scout output) scored_opps: list[ScoredOpportunity] (Forecaster output) approved_trade: Trade | None (Coordinator approval) execution_result: ExecutionResult | None (Executor result) risk_state: RiskState (drawdown, open positions, paused flag) agent_logs: list[str] (human-readable reasoning, displayed in dashboard) error_state: str | None (error handling)

6.3 Correlated Event Detection Logic
The Forecaster agent implements three classes of correlated mispricing detection:

Class	Description	Example	Detection Method
Probability Incoherence	Mutually exclusive outcomes on the same event don't sum to 100% (minus platform take rate)	US 2028 election: Candidate A 65% + Candidate B 40% = 105% (5% arbitrage)	Sum all outcome probabilities; if sum > 1 + take_rate, flag arbitrage
Cross-Platform Spread	Same event priced differently on two platforms	Capitola: 'SOL > $200 by June' at 45%; Polymarket via bridge: same event at 52%	Normalise event identifiers; compare bid/ask; flag if spread > min_threshold
Correlated Asset Divergence	Prediction market probability diverges from Pyth oracle implied probability for a correlated asset	BTC $100K by EOY at 30% on PM; Pyth BTC futures imply 45% — 15% gap	Pyth confidence intervals + Black-Scholes implied prob vs. market prob
Temporal Arbitrage	Same event resolving sooner is priced lower than later (calendar spread)	'BTC > $120K by July' at 20% vs 'BTC > $120K by December' at 19% (impossible)	Compare probabilities of nested events across resolution dates

6.4 System Prompt Architecture
Each agent has a fixed system prompt defining its role, output schema, and constraints. Key design principles:
    • Output format enforcement: Every agent prompt requires JSON output matching the defined TypedDict schema — prevents hallucinated fields from corrupting state
    • Prompt injection protection: System prompts include explicit negative examples of injected instructions; Coordinator validates all agent outputs before state update
    • RAG context injection: Forecaster and Coordinator receive the top-5 most similar past trades (by embedding similarity) injected into each prompt — enables learning from history without fine-tuning
    • Thinking mode control: Qwen3 supports /think and /no_think tokens in prompt prefix — non-thinking mode used for time-sensitive agents (Scout, Executor); thinking mode for analytical agents (Forecaster)

6.5 Agent Loop Timing
Phase	Devnet MVP	Mainnet Beta	Bottleneck
Scout polling interval	10–30s (public RPC rate limits)	1–5s (Helius staked)	External API rate limits
Forecaster reasoning	2–4s (Qwen3-8B local)	1–2s (upgraded hardware)	LLM inference speed
Executor simulation	1–2s (simulateTransaction)	<500ms (Jito simulateBundle)	RPC latency
Coordinator approval	1–2s (Qwen3-8B local)	<1s	LLM inference speed
Total loop: detect → execute	<8s target	<3s target	Aggregate of above


7. Solana Smart Contract Specification
7.1 Program Architecture
    • Framework: Anchor v1.0.0 (April 2026 stable release)
    • Language: Rust 1.85.0+ (MSRV enforced in Cargo.toml via [package.rust-version])
    • Program ID: Generated on devnet; fixed in declare_id!() macro
    • Compute budget: All instructions target <120,000 CU; explicit compute_budget::set_compute_unit_limit() prepended to each transaction
    • IDL: Auto-generated by anchor build; consumed by TypeScript frontend and Python agent for type-safe deserialization

7.2 Account Structures
Account	Seed	Size	Fields	Owner
VaultPDA	[b"vault", user_pubkey]	~256 bytes	owner: Pubkey, deposit_amount: u64, share_tokens: u64, created_at: i64, is_paused: bool	Arbet Program
GlobalConfig	[b"config"]	~128 bytes	admin: Pubkey, max_position_bps: u16, max_drawdown_bps: u16, slippage_bps: u16, agent_pubkey: Pubkey, min_edge_bps: u16	Arbet Program
TradeLog	[b"trade", user_pubkey, trade_id]	~512 bytes	trade_id: u64, timestamp: i64, market_a: [u8;64], market_b: [u8;64], amount_in: u64, amount_out: u64, edge_bps: i64, agent_reasoning_hash: [u8;32]	Arbet Program
ShareMint	Token-2022 mint	Token-2022 mint size	Token-2022 standard fields + MetadataPointer extension	SPL Token-2022 Program

7.3 Instructions
Instruction	Caller	Accounts	Logic	CU Estimate
initialize_vault	User (signed)	user, vault_pda, share_mint, global_config, system_program, token_program	Creates vault PDA; initialises share_mint with MetadataPointer; sets owner = user	~50,000 CU
deposit	User (signed)	user, vault_pda, user_token_account, vault_token_account, share_mint, token_program	Transfers SOL/USDC from user to vault; mints share tokens proportional to deposit / current NAV	~60,000 CU
withdraw	User (signed)	user, vault_pda, user_token_account, vault_token_account, share_mint, token_program	Burns user's share tokens; transfers proportional vault balance to user; updates vault state	~65,000 CU
execute_arb	Agent hot wallet (signed) + Coordinator approval	agent, vault_pda, global_config, target_market_program, trade_log, system_program	Validates agent signature matches global_config.agent_pubkey; checks position size <= max_position_bps; executes CPI to prediction market program; records trade	~100,000 CU
record_trade	Agent hot wallet (signed)	agent, trade_log, vault_pda, system_program	Creates TradeLog PDA; stores trade details + agent reasoning hash (SHA-256 of full reasoning log stored off-chain)	~40,000 CU
update_config	Admin (signed)	admin, global_config	Updates risk parameters; only admin can call; validates bounds (max_position_bps <= 5000 = 50% of vault)	~20,000 CU
emergency_pause	User (signed) OR Admin (signed)	caller, vault_pda	Sets vault.is_paused = true; execute_arb checks this flag and fails if paused; only owner or admin can unpause	~15,000 CU

7.4 Security Considerations
    • Signature verification: execute_arb validates agent_pubkey against global_config — prevents unauthorised callers from draining vault
    • Spend limits: On-chain max_position_bps enforced in execute_arb constraint — no single trade can exceed X% of vault TVL (configurable, default 20%)
    • Re-entrancy: Solana's account model prevents re-entrancy by design — each account can only be modified once per transaction
    • Integer overflow: All arithmetic uses checked_add / checked_mul / checked_div — panic on overflow rather than silent wrap
    • PDA ownership: All PDAs validated with seeds + bump; ownership checked via Anchor's #[account()] constraint system
    • Circuit breaker: emergency_pause halts all agent activity; withdrawal always remains available regardless of pause state
    • Audit plan: Devnet — manual review + Anchor's built-in security checks. Mainnet — formal audit (Otter Security / OtterSec) before launch


8. Functional Requirements
8.1 Wallet & Onboarding (FR-01 – FR-05)
ID	Requirement	Priority	Notes
FR-01	Support Phantom, Solflare, and Backpack wallet connection via @solana/wallet-adapter-react v0.19+	P0	Auto-detect installed wallets; mobile in-app browser support required
FR-02	Create PDA vault account on devnet upon first deposit; display vault address + SOL explorer link	P0	PDA derivation: ['vault', user_pubkey] — deterministic, one vault per wallet
FR-03	Display real-time wallet balance (SOL + USDC) and vault TVL	P0	Poll every 10s or on-chain WebSocket subscription via Helius
FR-04	Support SOL and USDC deposits with automatic wrapping if needed	P0	SOL auto-wrapped to wSOL for SPL compatibility
FR-05	Provide wallet disconnect and vault overview on return visit	P1	Persist user preferences in localStorage; no backend login required

8.2 Agent Control & Configuration (FR-06 – FR-12)
ID	Requirement	Priority	Notes
FR-06	System prompts define agent roles with output format, constraints, and tool list — immutable during execution cycle	P0	Stored in Python config file; injected at LangGraph node entry
FR-07	User can override risk parameters (max_position_bps, max_drawdown_bps, slippage_bps, min_edge_bps) via settings panel	P1	Changes trigger update_config instruction; validated on-chain
FR-08	All agent decisions logged in human-readable format with timestamp, reasoning, and outcome	P0	Required for judge demo — live log stream via WebSocket to dashboard
FR-09	RAG retrieval over past 500 trades: Forecaster injects top-5 similar historical trades into prompt	P1	SQLite-vec embedding store; nomic-embed-text model via Ollama
FR-10	Support pause/resume of agent swarm without wallet reconnection	P1	Pause: calls emergency_pause ix; Resume: calls update_config with is_paused=false
FR-11	Emergency circuit-breaker: automatically pause if vault drawdown exceeds max_drawdown_bps	P0	Coordinator agent checks every cycle; triggers emergency_pause ix immediately
FR-12	User can view and manually approve/reject individual trades in high-stakes mode (optional mode)	P2	Human-in-the-loop via LangGraph interrupt() — pauses graph, awaits frontend callback

8.3 Market Data & Arbitrage (FR-13 – FR-19)
ID	Requirement	Priority	Notes
FR-13	Scout fetches prices from Capitola API, Polymarket REST API, and Hedgehog devnet accounts every 10–30s	P0	Capitola: primary aggregator; Polymarket: https://gamma-api.polymarket.com; Hedgehog: solana-py account read
FR-14	Detect raw spreads above configurable minimum threshold (default: 300bps / 3%)	P0	Threshold accounts for platform take rate (typically 200–500bps on prediction markets)
FR-15	Forecaster applies correlated event logic: probability incoherence, cross-platform spread, Pyth divergence, temporal arbitrage	P0	Four detection classes; each configurable independently via global_config
FR-16	Executor builds atomic Jito bundle for both legs of synthetic arbitrage trade	P0	Bundle ensures both legs execute or neither does — critical for risk management
FR-17	Pre-execution simulation via simulateTransaction / simulateBundle before any on-chain action	P0	All devnet trades simulate first; simulation result shown in agent log
FR-18	Slippage protection: abort trade if simulated slippage exceeds slippage_bps threshold	P0	Slippage calculated from simulation output vs. expected fill price
FR-19	Record all trade results on-chain in TradeLog PDA; agent reasoning hash stored for auditability	P1	Full reasoning log stored off-chain in SQLite; SHA-256 hash committed on-chain

8.4 Portfolio & Analytics (FR-20 – FR-24)
ID	Requirement	Priority	Notes
FR-20	Real-time vault position dashboard: current TVL, PnL (absolute + %), open positions, drawdown gauge	P0	Recharts area chart; updates on each trade or every 10s
FR-21	Historical trade table: timestamp, markets traded, position size, edge captured (bps), agent decision summary	P0	Paginated table; sortable by PnL; links to Solana explorer tx
FR-22	Correlated event probability graph: dual time-series showing two related market probabilities; highlight arbitrage windows	P1	Recharts dual-axis line chart; data stored in SQLite opportunity log
FR-23	Agent performance leaderboard: per-agent accuracy, trade count, avg. edge captured (visible to all users post-mainnet)	P2	Requires on-chain aggregation or Supabase analytics query
FR-24	CSV export of full trade history including agent reasoning summaries	P2	Client-side CSV generation from SQLite API endpoint


9. System Architecture & Data Flow
9.1 High-Level Architecture
The Arbet system consists of four distinct layers communicating through well-defined interfaces:

Layer	Technology (All Free on Devnet)	Responsibility	Interface
L1 Blockchain	Solana Devnet (Agave Client v3.0.10)	Transaction execution, on-chain state, vault PDAs	JSON-RPC via solana-py / WebSocket subscriptions
Smart Contract	Anchor v1.0.0 (Rust 1.85.0)	Vault logic, trade recording, risk enforcement on-chain	IDL-based instruction calls from agent backend
Agent Backend	Python 3.12 + LangGraph + Ollama (Qwen3-8B)	Multi-agent coordination, market analysis, decision making	REST API to Next.js; WebSocket stream for live logs
Data Layer	SQLite + Helius Webhooks + Public APIs	Off-chain state, RAG embeddings, real-time event ingestion	Python sqlite3, aiohttp for external APIs
Oracle Layer	Pyth Network (devnet, 500+ feeds)	Price feeds for correlated asset analysis	Pyth pythnet-client Python SDK
MEV Layer	Jito (simulateBundle on devnet)	Atomic bundle execution, front-run protection	jito-py JSON-RPC library
Frontend	Next.js 15 + Vercel + wallet-adapter	User interface, real-time dashboard, wallet interactions	REST + WebSocket to agent backend; Solana web3.js for txs

9.2 Full Data Flow — Trade Execution
    1. Scout agent polls Capitola API + Polymarket REST API + Helius webhook events every 10–30s
    2. Price data normalised and stored in shared LangGraph state (market_snapshot)
    3. Forecaster agent receives market_snapshot; runs correlated event logic; scores opportunities; injects top-5 RAG similar trades from SQLite-vec embedding store
    4. Coordinator reviews scored_opps against risk rules (max_position_bps, is_paused, drawdown check)
    5. Executor builds Jito bundle: Instruction 1 = buy market A position; Instruction 2 = sell market B position; Instruction 3 = Jito tip transfer to tip account
    6. Executor calls simulateBundle via Jito devnet RPC; validates slippage < slippage_bps; CU < 1,400,000
    7. If simulation passes: Executor signs bundle with agent hot wallet and submits via Jito block engine
    8. Anchor program validates agent_pubkey, checks vault is_paused=false, enforces position size limits, executes CPI to prediction market program
    9. Executor calls record_trade instruction: creates TradeLog PDA with outcome + reasoning hash
    10. Helius webhook fires on TradeLog PDA creation; Next.js API route receives webhook; pushes live update via WebSocket to dashboard
    11. Dashboard renders new trade in trade history table + updates PnL chart + appends reasoning to agent log

9.3 Deployment Architecture
Component	Dev Environment	Hackathon Demo	Post-Hackathon Mainnet
Agent Backend	Local Python process (laptop)	Local + ngrok tunnel for webhook	VPS (Digital Ocean $4/mo) or Railway free tier
Ollama LLM	Local (laptop CPU/GPU)	Local (same machine as demo)	Local on VPS with NVIDIA A10G
Next.js Frontend	localhost:3000	Vercel free tier (auto-deploy from git)	Vercel Pro ($20/mo)
Database	SQLite file (local)	SQLite (same machine)	Supabase free tier → Pro
RPC	Public Devnet + Helius free 1M credits	Helius free devnet	Helius Starter ($50/mo) → Business
Smart Contract	anchor deploy --provider.cluster devnet	Same as dev	anchor deploy --provider.cluster mainnet-beta


10. Frontend Specification
10.1 Component Inventory
Component	Type	Data Source	Update Frequency	Priority
Wallet Connect Button	React Client Component	@solana/wallet-adapter-react	On user action	P0
Vault Deposit / Withdraw Modal	Dialog + Solana tx	Anchor program IDL, wallet balance	On user action	P0
Agent Swarm Status Cards (4x)	Live WebSocket subscriber	LangGraph agent state stream	Per agent turn (~10–30s)	P0
Agent Reasoning Log	Auto-scroll log panel	WebSocket stream from Python backend	Per agent turn	P0
Live Opportunity Feed	Scrolling list	WebSocket: Scout output	Every Scout poll cycle	P0
PnL Dashboard (Recharts)	Area + line charts	SQLite trade history API	Per trade + 10s refresh	P0
Correlated Event Graph	Dual-axis time series	SQLite opportunity log API	Every Scout poll cycle	P1
Trade History Table	Paginated sortable table	SQLite trades API + Solana explorer links	Per new trade	P0
Risk Settings Panel	Form → on-chain update	GlobalConfig PDA + update_config ix	On user save	P1
Emergency Pause Button	Single-click tx	emergency_pause Anchor instruction	On user action	P0

10.2 Design System
    • Typography: Inter (Google Fonts CDN) — system sans-serif fallback for performance
    • Color palette: Dark navy background (#0D1F3C) with electric blue (#2A7AE4) and teal accent (#00C49A) — designed to evoke high-tech trading terminal aesthetic
    • Layout: Responsive 12-column CSS Grid; mobile-first breakpoints at 640px, 1024px, 1440px
    • Accessibility: WCAG 2.1 AA compliance — minimum 4.5:1 contrast ratio, keyboard navigation for all interactive elements, ARIA labels on all dynamic components
    • Mobile: Phantom and Solflare in-app browser support tested and confirmed; touch-optimised deposit/withdraw flow
    • Performance: Lighthouse target score >90 on all axes; lazy-load charts; WebSocket connection pooled across components

10.3 Real-Time Data Strategy
The frontend uses a hybrid approach for real-time updates:
    • WebSocket (primary): Python agent backend exposes WebSocket endpoint (/ws/agents); Next.js API route proxies to client; React components subscribe via custom useAgentStream() hook
    • REST polling (fallback): If WebSocket disconnects, fallback to REST polling every 10s on /api/opportunities and /api/trades
    • Helius webhooks (secondary): On-chain events (vault deposit, trade record) trigger Helius webhook → Next.js API route → database update → WebSocket broadcast to all connected clients

11. Security Architecture & Risk Management
11.1 Security Domains
Domain	Risk	Mitigation	Owner
Smart Contract	Vault drain, PDA spoofing, integer overflow	Anchor constraint system, checked arithmetic, ownership validation, manual code review pre-mainnet, formal audit (OtterSec) post-hackathon	Smart Contract Lead
AI Prompt Injection	Malicious market data crafted to hijack agent output	Fixed system prompts; output JSON schema validation via Pydantic; Coordinator validates all Executor outputs before state mutation	Agent Backend Lead
Key Management	Agent hot wallet compromise	Devnet: .env file (local only, .gitignored). Mainnet: AWS Secrets Manager or HashiCorp Vault; agent only has execute_arb permission (limited scope)	DevOps Lead
MEV / Sandwich Attacks	Front-running of arbitrage trades	Jito bundle submission for all trades — atomic execution prevents sandwiching; dynamic tip adjusts to current block engine competition	Agent Backend Lead
RPC Reliability	Public RPC downtime disrupts agent loop	Primary: Helius free tier (99.99% uptime, globally distributed); Fallback 1: public devnet RPC; Fallback 2: local Surfpool validator for fully offline demos	Infrastructure Lead
Data Integrity	Fake market prices injected into Scout data	Multi-source price validation — if Capitola and Polymarket disagree by >500bps without a detected arbitrage, Scout flags anomaly and Coordinator skips cycle	Agent Backend Lead
User Fund Safety	Bug causes loss of deposited funds	Devnet: no real funds at risk. Mainnet: formal audit required; emergency_pause available to all users; maximum position limits enforced on-chain	All

11.2 On-Chain Risk Controls
    • Max position size: Configurable on-chain via global_config.max_position_bps (default: 2000 = 20% of vault TVL). Enforced in execute_arb before CPI call.
    • Max drawdown: Coordinator agent reads vault NAV every cycle; if cumulative loss exceeds max_drawdown_bps (default: 500 = 5%), triggers emergency_pause automatically
    • Slippage guard: Pre-execution simulateBundle; abort if actual fill > expected fill by slippage_bps (default: 150 = 1.5%)
    • Agent spend limit: execute_arb only callable by registered agent_pubkey in global_config — prevents any other wallet from triggering trades
    • Withdrawal always open: emergency_pause does not block withdraw instruction — users can always exit their position


12. KPIs & Success Metrics
12.1 Technical KPIs
KPI	Devnet MVP Target	Measurement Method	Owner
Agent tx success rate	>95%	Count(success) / Count(attempted) in TradeLog PDAs	Agent Backend
Average CU per tx	<120,000 CU	Anchor program compute unit tracking; Solana explorer verification	Smart Contract
Agent loop latency (detect → execute)	<8 seconds	LangGraph state timestamps: opportunity detected vs. tx confirmed	Agent Backend
Opportunities detected per hour	>5	Scout output log; count of opportunities above min_edge_bps threshold	Agent Backend
Average simulated edge per trade	>200bps (2%)	Executor simulation result vs. expected fill; recorded in TradeLog	Agent Backend
Frontend load time (Lighthouse)	<2 seconds (LCP)	Lighthouse CI in GitHub Actions; Vercel Analytics	Frontend
Agent reasoning log completeness	100% of decisions logged	Check agent_logs count == state transition count in LangGraph	Agent Backend
RPC error rate	<5%	solana-py exception tracking; Helius dashboard metrics	Infrastructure
Dashboard WebSocket latency	<500ms agent output → UI update	Performance.now() timestamp in useAgentStream() hook	Frontend
PnL simulation accuracy	±10% of Anchor-recorded PnL	Compare simulator estimate vs. TradeLog.edge_bps on-chain	Agent Backend

12.2 Business KPIs (Post-Hackathon)
KPI	Month 1	Month 3	Month 6	Year 1
TVL	$50K	$500K	$2M	$10M+
DAU	50	500	2,000	5,000+
Daily Trade Volume	$10K	$100K	$500K	$5M+
Protocol Revenue (2% perf. fee)	$200/day	$2K/day	$10K/day	$100K/day
Avg. APY to depositors	15–25%	12–20%	10–18%	8–15%
Markets Monitored	3	8	15	20+

13. Development Roadmap & Milestones
13.1 14-Day Hackathon Sprint
Day	Milestone	Deliverable	Risk
Day 1–2	Foundation: Anchor program skeleton	initialize_vault, deposit, withdraw compiling on devnet; basic PDA tests passing	Low — well-documented Anchor v1.0.0 templates available
Day 3	Smart contract core complete	execute_arb, record_trade, emergency_pause deployed to devnet; Anchor IDL generated and committed	Low
Day 4–5	Data layer: Scout agent	Scout fetches Capitola + Polymarket prices; normalises formats; outputs opportunity JSON; logged to SQLite	Medium — external API format changes possible
Day 6–7	Single-agent MVP loop	Scout → Forecaster pipeline working; simulated trade decisions logged; probability incoherence detection working on test data	Medium — LLM output format consistency
Day 8–9	Full 4-agent swarm + LangGraph orchestration	All 4 agents (Scout, Forecaster, Executor, Coordinator) in LangGraph StateGraph; full loop running locally end-to-end	High — agent coordination is core innovation, most complex step
Day 10	Devnet trade execution	Executor successfully submits simulated Jito bundle to devnet; TradeLog PDA created on-chain; verified in Solana explorer	Medium — Jito devnet bundle simulation API
Day 11–12	Frontend dashboard	Next.js dashboard deployed on Vercel; WebSocket live agent log; PnL chart; trade history table; wallet connect working	Low
Day 13	Integration & end-to-end demo	Full stack: wallet deposit → agent detects opportunity → executes → PnL visible in dashboard — repeatable demo flow	Medium — integration bugs expected
Day 14	Polish, documentation, submission	README with local setup instructions; demo video recorded; all devnet transactions verifiable; PRD + architecture diagram complete	Low

13.2 Post-Hackathon Roadmap
Phase	Timeline	Objective	Key Deliverables
Phase 1: Mainnet Beta Prep	Week 3–4	Formal security audit; mainnet deployment preparation	OtterSec audit initiated; mainnet program deploy; Helius Starter tier; private beta invites
Phase 2: Mainnet Beta Launch	Month 2–3	First real capital in vault; 500 DAU target	Public launch; performance fee mechanism live; Supabase migration; team expansion
Phase 3: Market Expansion	Month 3–6	Scale to 15+ prediction markets; additional correlated asset classes	Sports betting markets (SportX on Solana); Crypto options correlation; Drift BET integration
Phase 4: Token & Community Vaults	Month 6–9	ARBT governance token; community-created vault strategies	Token launch; vault strategy marketplace; DAO governance for fee parameters
Phase 5: Multi-Chain	Year 1	Expand to Ethereum L2 prediction markets (Polymarket direct); cross-chain correlated arbitrage	EVM agent backend; bridge integration; fully on-chain agent logic (Solana program autonomy)


14. Open Questions & Technical Decisions
#	Question	Options	Recommended Decision	Owner	Deadline
OQ-01	Autonomous vs. user-approved multisig for execute_arb?	A: Fully autonomous (agent hot wallet). B: 2/2 multisig (agent + user Squads)	Option A for hackathon speed; Option B for mainnet beta (Squads integration)	Tech Lead	Day 1
OQ-02	Local Ollama only vs. Groq free-tier fallback?	A: Ollama only (zero cost, local). B: Groq free tier (faster inference, cloud)	Option A primary; Option B as fallback for demo machines with <8GB RAM	Agent Backend Lead	Day 2
OQ-03	How many correlated event clusters in MVP?	A: 1 (US politics). B: 2 (politics + crypto). C: 3 (politics + crypto + sports)	Option B — 2 clusters provides stronger demo variety without exceeding development time	Product Lead	Day 3
OQ-04	Mock event token program vs. Hedgehog CPI for devnet trades?	A: Mock program (full control). B: Hedgehog devnet CPI (real integration)	Option A for Day 1–10; Option B added if Hedgehog devnet stable by Day 8	Smart Contract Lead	Day 4
OQ-05	SQLite vs. Chroma for vector store?	A: SQLite-vec (built-in, zero dependency). B: Chroma (purpose-built, richer API)	Option A — SQLite-vec is sufficient for <10K embeddings; eliminates Docker dependency	Agent Backend Lead	Day 4
OQ-06	Performance fee model on mainnet?	A: 0% (acquisition phase). B: 2% of profits only (industry standard). C: 0.5% AUM + 2% profit	Option A for devnet/beta; Option B for mainnet v1	Product Lead	Month 2
OQ-07	Agent hot wallet key storage on mainnet?	A: .env file on VPS. B: AWS Secrets Manager. C: HashiCorp Vault. D: Hardware HSM	Option B (AWS Secrets Manager) for mainnet — $0.40/secret/month, IAM-controlled access	DevOps Lead	Month 2
OQ-08	Surfpool for fully offline demo?	A: Use public devnet + Helius. B: Run local Surfpool validator for offline demo	Option B as fallback — Surfpool CLI v0.12.0 confirmed compatible with Anchor v1.0.0	Infrastructure Lead	Day 13

15. Technical Glossary
Term	Definition
Agave	The rebranded Solana Labs validator client (formerly solana-validator); current version 3.0.10 as of April 2026
AVM	Anchor Version Manager — CLI tool to install and switch between Anchor Framework versions
Bundle (Jito)	Group of up to 5 Solana transactions executed atomically and sequentially by Jito-enabled validators
Checkpoint (LangGraph)	Persisted snapshot of agent graph state enabling pause/resume, time-travel debugging, and failure recovery
Confidence Interval (Pyth)	Uncertainty range provided alongside each Pyth price feed — used by Forecaster to size positions conservatively when data uncertainty is high
Correlated Mispricing	A mathematical inconsistency between two related prediction markets that creates a risk-free or near-risk-free profit opportunity
CPI	Cross-Program Invocation — Solana mechanism allowing one on-chain program to call instructions on another program in a single transaction
CU	Compute Units — the measure of computational resources consumed by a Solana transaction; maximum 1,400,000 per transaction
DAS API	Digital Asset Standard API — Helius's standardised interface for querying NFTs, cNFTs, and Token-2022 assets on Solana
Devnet	Solana's free public test network; SOL obtained via airdrop; no real value; used for all MVP development
IDL	Interface Definition Language — JSON file auto-generated by Anchor describing all instructions, accounts, and types of a Solana program
Jito Tip	SOL payment included in a bundle to incentivise validators to process the bundle ahead of other transactions
LaserStream	Helius's gRPC-based ultra-low-latency data streaming service for blocks, transactions, and account changes
LangGraph	Open-source Python library for stateful multi-agent orchestration using directed cyclic graph architecture
LangSmith	LangChain's observability platform providing tracing, evaluation, and monitoring for LangGraph agent workflows
MEV	Maximal Extractable Value — profit extracted by reordering, inserting, or censoring transactions; Jito bundles protect Arbet trades from MEV attacks
MoE	Mixture of Experts — LLM architecture where only a subset of parameters ('experts') are active for any given token; enables large total params with efficient inference (e.g. Qwen3-Coder-Next: 80B total, 3B active)
Ollama	Open-source local LLM runtime supporting 100+ models via GGUF quantization; exposes OpenAI-compatible API at localhost:11434
PDA	Program Derived Address — deterministically derived Solana account address controlled by a program; no private key; used for vault accounts
Pull Oracle (Pyth)	Oracle model where users pull price updates on-chain when needed (vs. push where oracle continuously updates on-chain)
Q4_K_M	GGUF quantization format: 4-bit quantization with medium K-quantization; reduces model to 25-30% of original size with <5% quality loss
RAG	Retrieval-Augmented Generation — technique injecting relevant historical context (retrieved via embedding similarity) into LLM prompt
Solders	Rust-backed Python library providing high-performance Solana primitive operations (keypair, pubkey, instruction building)
Surfpool	Local Solana validator CLI (v0.12.0) for fully offline development and demos; compatible with Anchor v1.0.0
Synthetic Arbitrage	Taking offsetting positions across two platforms to capture a spread without directional market exposure
Token-2022	SPL Token Extensions standard supporting programmable transfer hooks, metadata pointers, transfer fees, and other advanced token behaviors
TVL	Total Value Locked — total USD value of assets deposited into the Arbet Vault
WCAG 2.1 AA	Web Content Accessibility Guidelines Level AA — minimum accessibility standard requiring 4.5:1 contrast, keyboard navigation, and screen reader support


Appendix A — Tool & Dependency Reference
Tool / Library	Version	Purpose	Cost	Install Command
Anchor CLI	1.0.0 (Apr 2, 2026)	Solana smart contract framework	Free / Open Source	avm install 1.0.0 && avm use 1.0.0
Rust	1.85.0+	Smart contract language	Free / Open Source	rustup update stable
Solana CLI (Agave)	3.0.10	Devnet deploy + key management	Free / Open Source	sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
Surfpool CLI	0.12.0	Local validator for offline demo	Free / Open Source	cargo install surfpool-cli
Python	3.12+	Agent backend language	Free / Open Source	System or pyenv
solana-py	Latest	Python Solana SDK	Free / Open Source	pip install solana
solders	Latest	Rust-backed Python Solana primitives	Free / Open Source	pip install solders
LangGraph	Latest (2026)	Multi-agent orchestration	Free / Open Source	pip install langgraph
LangChain	Latest	LLM tooling (LangGraph dependency)	Free / Open Source	pip install langchain
Ollama	v0.18+	Local LLM runtime	Free / Open Source	curl -fsSL https://ollama.com/install.sh | sh
Qwen3-8B (Q4_K_M)	Latest	Primary agent LLM	Free / Open Source	ollama pull qwen3:8b
SQLite-vec	Latest	Vector store for RAG embeddings	Free / Open Source	pip install sqlite-vec
jito-py	Latest	Jito bundle submission SDK	Free / Open Source	pip install jito-py
Next.js	15	Frontend framework	Free / Open Source	npx create-next-app@latest
@solana/wallet-adapter	0.19+	Wallet connection library	Free / Open Source	npm install @solana/wallet-adapter-react
Recharts	Latest	Dashboard charting library	Free / Open Source	npm install recharts
shadcn/ui	Latest	UI component library	Free / Open Source	npx shadcn-ui@latest init
Helius	Free tier	Enhanced Solana RPC + webhooks + DAS API	$0 (1M credits/month)	https://helius.dev (no credit card)
Vercel	Free tier	Frontend hosting + serverless functions	$0 (100GB-hours/month)	https://vercel.com (GitHub integration)
Supabase	Free tier (mainnet)	PostgreSQL + real-time subscriptions	$0 (500MB storage)	https://supabase.com

Appendix B — Risk Register
Risk ID	Risk Description	Probability	Impact	Mitigation Strategy
R-01	Public Solana Devnet rate-limiting disrupts Scout polling during demo	Medium	High	Helius free tier as primary RPC; public devnet as fallback; Surfpool local validator as final fallback
R-02	Ollama LLM output fails to conform to required JSON schema	Medium	High	Pydantic validation on every agent output; retry with temperature=0 and explicit format reminder; max 3 retries before Coordinator skips cycle
R-03	Qwen3-8B too slow on judge's demo machine (CPU-only)	Medium	Medium	Pre-loaded model in Ollama; phi4:3.8b (~3GB) as lightweight fallback; Groq free-tier as cloud backup
R-04	Helius free tier 1M credits exhausted during hackathon	Low	Medium	1M credits ≈ 10,000 complex API calls — more than sufficient for 14 days. Monitor via Helius dashboard.
R-05	Jito devnet simulateBundle API unavailable	Low	Medium	Fallback to standard simulateTransaction for pre-execution validation; note limitation in demo
R-06	Correlated event logic produces false positives (non-existent arbitrage)	High	Medium	Minimum edge threshold (default 300bps) filters noise; Coordinator requires >80% Forecaster confidence; paper trade log tracks false positive rate
R-07	Polymarket public API rate-limited or format changes	Medium	Medium	Cache last successful response; retry with exponential backoff; Capitola API as primary — Polymarket as supplementary
R-08	Smart contract bug in execute_arb causes incorrect vault balance	Low	Critical	Devnet only — no real funds at risk. All TradeLog PDAs auditable on Solana explorer. Emergency pause always available.


Document prepared for Hackathon Submission — April 2026. All technology versions verified against live documentation as of April 12, 2026. For questions, contact the Arbet Agents core team.