# 🏗️ Arbet Agents — Engineering Breakdown & Execution Plan
**Version 1.0** | **April 14, 2026** | **14-Day Hackathon Sprint**

---

## Executive Overview

This document translates the Arbet PRD v2.0 into **actionable engineering tasks**, **structured workflows**, and **clear dependencies** for three distinct teams:
- **Smart Contract Engineers** (Anchor/Rust)
- **Agent Backend Engineers** (Python/LangGraph)
- **Frontend Engineers** (Next.js/React)

All tasks are organized by **priority, execution order, and team responsibility**, with **acceptance criteria** that map to the PRD's technical requirements.

---

## 1️⃣ SMART CONTRACT ENGINEERING (Anchor v1.0.0)

### Task SC-01: Foundation — Anchor Program Skeleton
**Priority:** P0 | **Owner:** Smart Contract Lead | **Duration:** 2 days | **Deps:** None

#### Objective
Create the foundational Anchor v1.0.0 smart contract structure with all account types and basic vault operations.

#### Deliverables
- [ ] Initialize Anchor project via AVM 1.0.0
- [ ] Define 4 account structures: VaultPDA, GlobalConfig, TradeLog, ShareMint (Token-2022)
- [ ] Implement initialize_vault instruction (~50k CU)
- [ ] Implement deposit instruction (~60k CU)
- [ ] Implement withdraw instruction (~65k CU)
- [ ] Generate IDL and commit to version control
- [ ] Set up Anchor.toml for devnet deployment
- [ ] Write basic unit tests for PDA derivation

#### Implementation Guide
```rust
// Key account seeds (deterministic PDAs)
1. VaultPDA: [b"vault", user_pubkey]
   - Fields: owner, deposit_amount, share_tokens, created_at, is_paused
2. GlobalConfig: [b"config"]
   - Fields: admin, max_position_bps, max_drawdown_bps, slippage_bps, agent_pubkey, min_edge_bps
3. TradeLog: [b"trade", user_pubkey, trade_id]
   - Fields: market_a, market_b, amount_in, amount_out, edge_bps, reasoning_hash
4. ShareMint: Token-2022 mint with MetadataPointer extension
```

#### Acceptance Criteria
- ✅ `anchor build` compiles without errors/warnings
- ✅ All PDAs created with correct seeds (derive_pda syntax)
- ✅ IDL generated; all types match TypeScript/Python SDKs
- ✅ Basic tests pass: vault creation, ownership checks
- ✅ Deployable to devnet with `anchor deploy`

---

### Task SC-02: Core Logic — Trade Execution & Risk Controls
**Priority:** P0 | **Owner:** Smart Contract Lead | **Duration:** 1 day | **Deps:** SC-01

#### Objective
Implement the critical trading and governance instructions that enforce on-chain risk rules.

#### Instructions to Build

| Instruction | CU | Validation Logic | Notes |
|---|---|---|---|
| **execute_arb** | 100k | Agent signature, position limit, drawdown check | Core trade execution |
| **record_trade** | 40k | Creates TradeLog PDA, hashes reasoning | Audit trail |
| **update_config** | 20k | Admin-only, bounds checking | Risk parameter updates |
| **emergency_pause** | 15k | User/admin, sets is_paused flag | Circuit breaker |

#### Key Implementation Details

**execute_arb Validation:**
```
1. Verify agent_pubkey matches global_config.agent_pubkey
2. Check vault.is_paused == false (reject if paused)
3. Enforce position_size <= (vault_tvl * max_position_bps / 10000)
4. Verify Coordinator approval (optional multisig for mainnet)
5. Execute CPI to prediction market program
6. Update trade_log
```

**Arithmetic Safety:**
- Use `checked_add`, `checked_mul`, `checked_div` for all calculations
- Panic on overflow (solana-program default)
- No silent wraparound

#### Acceptance Criteria
- ✅ All 4 instructions compile and deploy
- ✅ Position limits enforced in execute_arb (manual test: try to trade >max_position_bps)
- ✅ Pause flag blocks execute_arb but allows withdraw
- ✅ TradeLog PDAs verifiable in Solana explorer
- ✅ Checked arithmetic triggers panic on overflow

---

### Task SC-03: Security & Testing
**Priority:** P0 | **Owner:** Smart Contract Lead | **Duration:** 1 day | **Deps:** SC-02

#### Objective
Harden the smart contract against common vulnerabilities and validate all edge cases.

#### Security Checklist
- [ ] **Re-entrancy:** Solana native; no action needed (single-write per tx)
- [ ] **Integer overflow:** All arithmetic checked (✅ SC-02)
- [ ] **Signature validation:** Agent pubkey checked in execute_arb
- [ ] **PDA ownership:** Anchor #[account(...)] constraint system
- [ ] **Spend limits:** max_position_bps enforced on-chain
- [ ] **Manual audit:** Internal peer review of all instructions
- [ ] **Devnet formal audit:** N/A (no real funds); mainnet: OtterSec (Week 3–4)

#### Testing
- [ ] Unit tests: 100% instruction coverage
- [ ] Integration tests: Deposit → Execute → Withdraw flow
- [ ] Edge case tests:
  - Zero deposit/withdraw
  - Vault fully drained
  - Position size = exactly max_position_bps
  - Pause/unpause cycles

#### Acceptance Criteria
- ✅ All unit tests pass
- ✅ Integration test: 5+ deposit → trade → withdraw cycles
- ✅ No panics on valid inputs
- ✅ Code review sign-off from 1 peer

---

## 2️⃣ AGENT BACKEND ENGINEERING (Python/LangGraph)

### Task AG-01: Scout Agent — Market Data Pipeline
**Priority:** P0 | **Owner:** Backend Lead | **Duration:** 2 days | **Deps:** SC-02

#### Objective
Build the continuous market surveillance agent that polls three prediction platforms.

#### Data Sources & APIs

| Platform | Endpoint | Rate Limit | Fallback |
|---|---|---|---|
| **Capitola** | Public API | 100 req/min | Cache last response |
| **Polymarket** | gamma-api.polymarket.com/markets | 10 req/sec | Skip if down |
| **Hedgehog Devnet** | Solana account reads (solana-py) | N/A | Retry with backoff |
| **Pyth Devnet** | pythnet-client SDK | N/A | Use Helius API |

#### Scout Workflow
```
1. Poll Capitola → Normalize prices to [market_id, bid, ask, timestamp]
2. Poll Polymarket → Extract matching markets, bridge cross-platform
3. Read Hedgehog accounts → solana-py AsyncClient.get_account_info()
4. Query Pyth feeds → Get confidence intervals
5. Detect spreads: if (ask - bid) / bid > min_threshold (300bps) → flag
6. Output: JSON list of RawOpportunity objects
7. Sleep 10–30s, repeat
```

#### Scout Tools (LLM callable)
```python
def fetch_capitola_prices() -> list[Market]:
    """Query Capitola aggregator; return normalized format"""

def fetch_polymarket_api() -> list[PolymarketMarket]:
    """Parse Polymarket REST; cross-reference with Capitola"""

def read_hedgehog_accounts() -> list[HedgehogPosition]:
    """On-chain reads via solana-py AsyncClient"""

def query_pyth_feeds() -> dict[str, PythFeed]:
    """Fetch Pyth price feeds + confidence intervals"""
```

#### Implementation Checklist
- [ ] Set up async polling loop (asyncio)
- [ ] Implement error handling: API downtime recovery, cache fallback
- [ ] Normalize all price formats to standard schema
- [ ] Spread detection: flag spreads >300bps
- [ ] Output validation: Pydantic schema for RawOpportunity
- [ ] Logging: all prices fetched + spreads detected logged with timestamp
- [ ] SQLite persistence: store all raw opportunities for historical analysis
- [ ] Rate limit handling: respect all API limits; back off on 429 errors

#### RawOpportunity Schema
```python
@dataclass
class RawOpportunity:
    market_id: str
    market_a: str
    market_b: str
    bid_a: float
    ask_a: float
    bid_b: float
    ask_b: float
    spread_bps: int
    detection_class: str  # "raw_spread" | "price_divergence" | "temporal"
    timestamp: int
    source_a: str  # platform name
    source_b: str
```

#### Acceptance Criteria
- ✅ Fetches live prices every 10–30s without crash
- ✅ Detects spreads >300bps accurately (manual verification against explorers)
- ✅ Normalizes all three platforms to consistent schema
- ✅ 5+ opportunities detected per hour on active markets
- ✅ API downtime >10 min: survives without crash; caches last valid response
- ✅ Output matches TypedDict; consumed by Forecaster agent
- ✅ Logging captures all fetches; errors logged with stack trace

---

### Task AG-02: Forecaster Agent — Correlated Event Detection
**Priority:** P0 | **Owner:** Backend Lead | **Duration:** 2 days | **Deps:** AG-01, SC-02, DATA-01

#### Objective
Implement advanced opportunity scoring with correlated mispricing detection (4 classes).

#### Correlated Event Detection Logic

| Class | Example | Detection Method | Implementation |
|---|---|---|---|
| **Probability Incoherence** | A: 65%, B: 40% (mutually exclusive) = 105% arbitrage | Sum outcomes; if > 1 + take_rate → flag | LLM-guided analysis |
| **Cross-Platform Spread** | Capitola: 45%; Polymarket: 52% (same event) | Normalize market IDs; compare prices | Market matching + spread calc |
| **Correlated Asset Divergence** | PM: 30%; Pyth implied: 45% (15% gap) | Black-Scholes implied prob vs market | Pyth confidence + BSM formula |
| **Temporal Arbitrage** | July: 20%, Dec: 19% (impossible nested) | Temporal consistency check | Nested event comparison |

#### Forecaster Tools (LLM callable)
```python
def pyth_confidence_check(feed_id: str) -> PythConfidenceInterval:
    """Query Pyth confidence interval; use to size positions conservatively"""

def historical_edge_lookup() -> list[Trade]:
    """RAG retrieval: top-5 similar past trades from SQLite-vec"""

def correlation_matrix_compute(markets: list[str]) -> np.ndarray:
    """Compute Pearson correlation; flag if >0.7"""

def black_scholes_implied_prob(price: float, strike: float, T: float) -> float:
    """Convert asset price to implied probability via BSM"""
```

#### Scoring Algorithm

```
For each opportunity from Scout:
  1. Classify mispricing: which of 4 classes?
  2. Estimate edge: account for slippage, fees (200–500bps)
  3. Confidence: How confident is this edge real? (0–1)
     - Higher confidence if multiple detection classes align
     - Lower confidence if Pyth confidence interval wide
  4. Position size: size inversely with uncertainty
     - base_size = 1% of vault TVL
     - adjusted_size = base_size * confidence * (1 / pyth_confidence_width)
     - capped at max_position_bps
  5. Output: ScoredOpportunity with all calculations

  Filter: Keep only top-N opportunities by edge * confidence
```

#### RAG Integration
- **Trigger:** Before Forecaster scoring, retrieve top-5 similar past trades
- **Similarity:** Embedding cosine similarity via SQLite-vec
- **Injection:** Include in system prompt: "Past similar trades in this cluster..."
- **Learning:** Enable historical pattern recognition

#### Forecaster Tools & Prompts
- **Model:** DeepSeek R1 14B (chain-of-thought) OR Qwen3-8B thinking mode
- **Temperature:** 0 for deterministic scoring
- **Output format:** Strict JSON schema validation via Pydantic

#### ScoredOpportunity Schema
```python
@dataclass
class ScoredOpportunity:
    raw_opportunity: RawOpportunity
    mispricing_class: str
    edge_estimate_bps: int
    confidence_score: float  # 0–1
    recommended_size_pct: float  # 0.1–5% of vault TVL
    reasoning: str
    pyth_data: dict  # confidence intervals, implied probs
    similar_trades: list[Trade]  # RAG context
```

#### Acceptance Criteria
- ✅ Detects all 4 mispricing classes on test data
- ✅ Edge estimates within ±10% of actual filled edge
- ✅ RAG retrieval returns top-5 similar trades (>0.7 similarity)
- ✅ Position sizing scales correctly with confidence/uncertainty
- ✅ Outputs valid JSON matching ScoredOpportunity schema
- ✅ Reasoning log captures all analysis steps
- ✅ Confidence scores correlate with realization (backtest validation)

---

### Task AG-03: Executor Agent — Trade Building & Bundle Submission
**Priority:** P0 | **Owner:** Backend Lead | **Duration:** 2 days | **Deps:** AG-02, SC-02

#### Objective
Build transactions for both legs of arbitrage, simulate, and submit via Jito bundles.

#### Executor Workflow

```
Receive Coordinator-approved trade:
  1. Build Instruction 1: Buy market A (from platform A)
  2. Build Instruction 2: Sell market B (to platform B)
  3. Build Instruction 3: Jito tip transfer (agent fee to Jito)
  4. Combine into Jito bundle (atomic execution)
  5. Pre-flight: simulateBundle (devnet) / simulateTransaction (fallback)
  6. Validate: CU < 1.4M, slippage < slippage_bps threshold
  7. Submit bundle via Jito block engine
  8. Poll transaction status (up to 30 seconds)
  9. Record result in TradeLog PDA
  10. Return ExecutionResult to LangGraph state
```

#### Executor Tools (LLM callable)
```python
def build_buy_instruction(market_a: str, amount: int, limit_price: float) -> Instruction:
    """Construct buy leg; CPI to prediction market program"""

def build_sell_instruction(market_b: str, amount: int, limit_price: float) -> Instruction:
    """Construct sell leg; CPI to prediction market program"""

def simulate_bundle_jito(bundle: List[Instruction]) -> SimulationResult:
    """Pre-flight via Jito devnet RPC; validate CU + slippage"""

def send_jito_bundle(bundle: List[Instruction], tip_lamports: int) -> str:
    """Submit to Jito block engine; return tx signature"""

def record_trade_pda(tx_sig: str, edge: int, slippage: int) -> None:
    """Call record_trade instruction; create TradeLog PDA"""

def dynamic_tip_calculation() -> int:
    """Query Jito tip router; return optimal tip in lamports"""
```

#### Atomic Bundle Design

**Critical for Risk Management:** Both legs must execute or neither does.

```
Jito Bundle (3–4 instructions):
  1. Limit Order: Buy at market A (price <= limit_a)
  2. Limit Order: Sell at market B (price >= limit_b)
  3. Jito Tip Transfer: agent hot wallet → Jito tip account
  [Optional 4: If MEV protection needed, add additional constraints]
```

#### Slippage Protection

```python
expected_fill_a = (bid_a + ask_a) / 2
expected_fill_b = (bid_b + ask_b) / 2
simulated_fill_a = simulation_result.fill_price_a
simulated_fill_b = simulation_result.fill_price_b

actual_slippage_bps = abs(
    (simulated_fill_a - expected_fill_a) / expected_fill_a
    + (simulated_fill_b - expected_fill_b) / expected_fill_b
) * 10000

if actual_slippage_bps > max_slippage_bps:
    ABORT_TRADE("slippage exceeds threshold")
```

#### Error Recovery
- Jito bundle unavailable → Fallback to direct RPC submission
- Failed simulation → Abort trade (logged)
- TX timeout (>30s) → Mark as "PENDING" in log; manual review needed
- Retry logic: Up to 3 retries with exponential backoff (1s, 2s, 4s)

#### ExecutionResult Schema
```python
@dataclass
class ExecutionResult:
    success: bool
    tx_signature: str | None
    filled_price_a: float
    filled_price_b: float
    actual_edge_bps: int
    slippage_bps: int
    cu_used: int
    timestamp: int
    error_message: str | None
```

#### Acceptance Criteria
- ✅ Builds valid Jito bundles (2–3 instructions)
- ✅ simulateBundle returns success for valid trades
- ✅ Aborts trades exceeding slippage threshold
- ✅ TX confirmed on-chain within <5s
- ✅ TradeLog PDA created with correct details
- ✅ Reasoning hash (SHA-256) recorded for auditability
- ✅ CU usage <120k per instruction
- ✅ Handles API failures gracefully (retries, fallback)

---

### Task AG-04: Coordinator Agent — Risk Governance
**Priority:** P0 | **Owner:** Backend Lead | **Duration:** 1.5 days | **Deps:** AG-02, SC-02

#### Objective
Enforce on-chain risk rules; approve/veto Executor trades; trigger circuit breaker.

#### Risk Controls

| Rule | Threshold | Action | Implementation |
|---|---|---|---|
| **Position Size** | max_position_bps (default 2000) | Veto if exceeded | Check: trade_size <= vault_tvl * max_position_bps / 10000 |
| **Drawdown** | max_drawdown_bps (default 500) | Trigger emergency_pause | Check: cumulative loss > threshold |
| **Correlation Risk** | Pearson corr > 0.7 | Reduce position size | Compute correlation matrix of open positions |
| **Confidence Threshold** | min_confidence (default 0.8) | Veto if Forecaster score too low | Check: confidence_score >= min_confidence |

#### Coordinator Tools (LLM callable)
```python
def check_vault_drawdown() -> float:
    """Calculate (initial_nav - current_nav) / initial_nav; return as %"""

def validate_position_size(trade_size: int) -> bool:
    """Check trade_size <= vault_tvl * max_position_bps / 10000"""

def check_correlation_risk(markets: list[str]) -> bool:
    """Compute Pearson correlation of open positions; flag if >0.7"""

def trigger_circuit_breaker() -> None:
    """Call emergency_pause instruction; pause swarm"""

def query_vault_state() -> VaultPDA:
    """Read vault PDA for current NAV, shares, etc."""
```

#### Coordinator Decision Logic

```python
def coordinator_decide(scored_opps: list[ScoredOpportunity]) -> tuple[Trade, str]:
    """Approve or veto Executor's proposed trade"""

    if vault.is_paused:
        return None, "Vault paused by user"

    if not scored_opps:
        return None, "No opportunities scored"

    top_opp = scored_opps[0]

    # Check position size
    if top_opp.recommended_size_pct > max_position_bps / 10000:
        return None, f"Position size {top_opp.recommended_size_pct}% > max {max_position_bps / 10000}%"

    # Check vault drawdown
    current_drawdown = check_vault_drawdown()
    if current_drawdown > max_drawdown_bps / 10000:
        trigger_circuit_breaker()  # Pause vault
        return None, f"Drawdown {current_drawdown}% > max {max_drawdown_bps / 10000}%; PAUSED"

    # Check correlation risk
    if not check_correlation_risk([top_opp.market_a, top_opp.market_b]):
        # Reduce position size if correlated
        adjusted_size = top_opp.recommended_size_pct * 0.5
        return Trade(..., adjusted_size), "Approved (size reduced due to correlation)"

    # Check confidence
    if top_opp.confidence_score < min_confidence:
        return None, f"Confidence {top_opp.confidence_score} < min {min_confidence}"

    return Trade(...), "Approved"
```

#### Coordinator Output Schema
```python
@dataclass
class CoordinatorDecision:
    approved: bool
    trade: Trade | None
    reasoning: str
    risk_checks: dict  # All checks run + results
    updated_risk_state: RiskState
```

#### Acceptance Criteria
- ✅ Correctly blocks trades exceeding position size limits
- ✅ Triggers emergency_pause when drawdown exceeded
- ✅ Maintains accurate drawdown tracking across multiple trades
- ✅ All decisions logged with reasoning
- ✅ Correlation risk correctly computed
- ✅ Confidence threshold enforced

---

### Task AG-05: LangGraph Orchestration — 4-Agent Swarm Integration
**Priority:** P0 | **Owner:** Backend Lead | **Duration:** 1.5 days | **Deps:** AG-01, AG-02, AG-03, AG-04

#### Objective
Integrate all 4 agents into cohesive LangGraph StateGraph with persistence and error recovery.

#### Graph Architecture

```
┌─────────────────────────────────────────────────────┐
│                  START                              │
└────────────────────┬────────────────────────────────┘
                     ↓
        ┌────────────────────────────┐
        │   SCOUT AGENT              │
        │ (10–30s polling)           │
        │ Output: opportunities      │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  FORECASTER AGENT          │
        │ (Score opportunities)      │
        │ Output: scored_opps        │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │ COORDINATOR AGENT          │
        │ (Validate risk rules)      │
        ├────────────────────────────┤
        │ If approved → EXECUTOR     │
        │ If veto → IDLE             │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │ EXECUTOR AGENT             │
        │ (Build, simulate, submit)  │
        │ Output: execution_result   │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │ RECORD_TRADE               │
        │ (Persist TradeLog PDA)     │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │ LOOP: Wait 10–30s          │
        │ [Checkpoint state]         │
        └────────────────────────────┘
```

#### LangGraph State Schema

```python
@dataclass
class SwarmState(TypedDict):
    # Market data
    market_snapshot: dict  # {market_id: {bid, ask, timestamp}}

    # Opportunity progression
    opportunities: list[RawOpportunity]  # Scout output
    scored_opps: list[ScoredOpportunity]  # Forecaster output

    # Trading
    approved_trade: Trade | None  # Coordinator decision
    execution_result: ExecutionResult | None  # Executor result

    # Risk state
    risk_state: RiskState  # {drawdown, paused, open_positions}

    # Audit trail
    agent_logs: list[str]  # Human-readable reasoning
    error_state: str | None

    # Metadata
    loop_iteration: int
    timestamp: int
```

#### Node Definitions

```python
# Each node is a function: state -> state

def scout_node(state: SwarmState) -> SwarmState:
    """Poll markets; update market_snapshot + opportunities"""
    # ... fetch prices ...
    state["market_snapshot"] = {...}
    state["opportunities"] = [RawOpportunity(...), ...]
    state["agent_logs"].append(f"[Scout] Fetched {len(state['opportunities'])} opportunities")
    return state

def forecaster_node(state: SwarmState) -> SwarmState:
    """Score opportunities; apply correlated event logic"""
    if not state["opportunities"]:
        state["agent_logs"].append("[Forecaster] No opportunities to score")
        return state
    # ... score each opportunity ...
    state["scored_opps"] = [ScoredOpportunity(...), ...]
    state["agent_logs"].append(f"[Forecaster] Scored {len(state['scored_opps'])} opportunities")
    return state

def coordinator_node(state: SwarmState) -> SwarmState:
    """Validate risk; approve/veto top opportunity"""
    decision, reasoning = coordinator_decide(state["scored_opps"])
    state["approved_trade"] = decision
    state["agent_logs"].append(f"[Coordinator] {reasoning}")
    if decision is None:
        state["risk_state"]["paused"] = True  # If circuit breaker triggered
    return state

def executor_node(state: SwarmState) -> SwarmState:
    """Build, simulate, execute trade"""
    if state["approved_trade"] is None:
        state["agent_logs"].append("[Executor] No approved trade; idle")
        return state
    # ... build bundle, simulate, submit ...
    state["execution_result"] = ExecutionResult(...)
    state["agent_logs"].append(f"[Executor] Trade {execution_result.tx_signature[:8]}... confirmed")
    return state

def record_trade_node(state: SwarmState) -> SwarmState:
    """Persist trade on-chain"""
    if state["execution_result"] is None or not state["execution_result"].success:
        return state
    # ... call record_trade instruction ...
    state["agent_logs"].append("[RecordTrade] PDA created")
    return state
```

#### Checkpointing (State Persistence)

```python
# Devnet: SQLite backend
graph = graph.compile(
    checkpointer=SqliteSaver.from_conn_string(":memory:")
)

# Mainnet: Supabase backend
graph = graph.compile(
    checkpointer=PostgresSaver(connection_string=SUPABASE_URL)
)

# Enables:
# - Pause/resume agent swarm mid-execution
# - Time-travel debugging: replay any decision
# - Failure recovery: resume from last checkpoint
```

#### Error Handling & Validation

```python
def validate_agent_output(output: dict, schema: type) -> dict:
    """Validate JSON schema via Pydantic; retry on failure"""
    try:
        validated = schema.model_validate(output)
        return validated.model_dump()
    except ValidationError as e:
        # Retry with temperature=0 + explicit format reminder
        logger.warning(f"Schema validation failed: {e}. Retrying...")
        # ... retry logic ...
        if retry_count > 3:
            raise  # Coordinator skips cycle

# Apply to all agent outputs:
state["opportunities"] = validate_agent_output(raw_output, RawOpportunity)
state["scored_opps"] = validate_agent_output(raw_output, ScoredOpportunity)
```

#### System Prompts

**Scout Prompt:**
```
You are the Scout agent. Your job is to continuously monitor prediction markets
and detect raw pricing spreads that might be profitable.

Your output MUST be valid JSON matching this schema:
[
  {
    "market_id": "string",
    "market_a": "string",
    "market_b": "string",
    "bid_a": float,
    "ask_a": float,
    "bid_b": float,
    "ask_b": float,
    "spread_bps": int,
    "detection_class": "string",
    "timestamp": int,
    "source_a": "string",
    "source_b": "string"
  }
]

Do not add extra fields. Do not include explanations outside the JSON.
```

**Forecaster Prompt (with RAG context):**
```
You are the Forecaster agent. Your job is to score opportunities by applying
advanced correlation logic and risk analysis.

[RAG Context Injection]
Below are the top 5 most similar past trades from our history:
1. [Trade details: markets, edge, outcome, reasoning]
2. [Trade details...]
3. ...

Use these past trades to inform your current scoring.

Your output MUST be valid JSON matching this schema:
[
  {
    "raw_opportunity": {...},
    "mispricing_class": "string",
    "edge_estimate_bps": int,
    "confidence_score": float,
    "recommended_size_pct": float,
    "reasoning": "string",
    "pyth_data": {...},
    "similar_trades": [...]
  }
]
```

**Thinking Mode Control:**
```python
# For Forecaster: Enable thinking (complex reasoning)
forecaster_prompt = "/think\n" + forecaster_base_prompt

# For Scout/Executor: Disable thinking (speed)
scout_prompt = "/no_think\n" + scout_base_prompt
```

#### Acceptance Criteria
- ✅ LangGraph graph initializes without errors
- ✅ State TypedDict properly passed between all agents
- ✅ Checkpointing enables pause/resume
- ✅ Pydantic validates all agent outputs; retries on schema mismatch
- ✅ Agent logs aggregated correctly; readable in dashboard
- ✅ Full loop executes every 10–30s without deadlock
- ✅ Time-travel debugging allows replay of any decision
- ✅ Circuit breaker triggers correctly on drawdown exceeded

---

## 3️⃣ DATA LAYER ENGINEERING (SQLite + RAG)

### Task DATA-01: SQLite Setup & RAG Vector Store
**Priority:** P0 | **Owner:** Backend Lead | **Duration:** 1 day | **Deps:** None

#### Objective
Build the persistent off-chain data layer with SQLite and vector embeddings for RAG.

#### Database Schema

**Table: users**
```sql
CREATE TABLE users (
    user_pubkey TEXT PRIMARY KEY,
    vault_address TEXT,
    created_at INTEGER,
    last_activity INTEGER
);
```

**Table: trades**
```sql
CREATE TABLE trades (
    trade_id INTEGER PRIMARY KEY,
    user_pubkey TEXT NOT NULL,
    timestamp INTEGER,
    market_a TEXT,
    market_b TEXT,
    amount_in INTEGER,
    amount_out INTEGER,
    edge_bps INTEGER,
    reasoning_hash TEXT,  -- SHA-256 of full reasoning log
    tx_signature TEXT,
    FOREIGN KEY(user_pubkey) REFERENCES users(user_pubkey)
);
```

**Table: opportunities**
```sql
CREATE TABLE opportunities (
    opportunity_id INTEGER PRIMARY KEY,
    timestamp INTEGER,
    market_a TEXT,
    market_b TEXT,
    spread_bps INTEGER,
    detection_class TEXT,
    is_executed BOOLEAN,
    discovered_by_agent TEXT,
    recorded_by INTEGER  -- ref to trades.trade_id if executed
);
```

**Table: agent_logs**
```sql
CREATE TABLE agent_logs (
    log_id INTEGER PRIMARY KEY,
    timestamp INTEGER,
    agent_name TEXT,  -- "Scout", "Forecaster", "Coordinator", "Executor"
    level TEXT,  -- "DEBUG", "INFO", "WARN", "ERROR"
    message TEXT,
    context_json TEXT  -- serialized state snapshot
);
```

**Table: embeddings (SQLite-vec)**
```sql
CREATE TABLE embeddings (
    trade_id INTEGER PRIMARY KEY,
    embedding BLOB,  -- 384-dim vector (512 bytes after quantization)
    created_at INTEGER,
    FOREIGN KEY(trade_id) REFERENCES trades(trade_id)
);
```

#### RAG Implementation

**Vector Embeddings:**
- Model: `nomic-embed-text` (384-dim, runs locally via Ollama)
- Quantization: Q4_K_M for storage efficiency
- Process: After each trade recorded, generate embedding from reasoning text
- Storage: SQLite-vec extension for efficient cosine similarity queries

**RAG Workflow:**
```python
# 1. After Executor completes trade, generate embedding
reasoning_text = state["agent_logs"][-1]  # Last agent log entry
embedding = ollama_embed(reasoning_text, model="nomic-embed-text")
store_embedding(trade_id, embedding)

# 2. Before Forecaster scores opportunities, retrieve similar trades
current_opportunity_text = format_opportunity(state["opportunities"][0])
current_embedding = ollama_embed(current_opportunity_text)
similar_trades = sqlite_vec_search(
    current_embedding,
    k=5,  # Top 5 most similar
    min_similarity=0.7
)

# 3. Inject into Forecaster prompt
forecaster_prompt += "\nSimilar past trades:\n"
for trade in similar_trades:
    forecaster_prompt += f"- {trade.reasoning}\n"
```

#### Data Migrations

```python
# Alembic-style migration system (simple for MVP)
def migrate_001_initial_schema():
    """Create all tables"""
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(SCHEMA_SQL)

def migrate_002_add_indexes():
    """Add performance indexes"""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("CREATE INDEX idx_trades_user ON trades(user_pubkey)")
        conn.execute("CREATE INDEX idx_trades_timestamp ON trades(timestamp)")
        conn.execute("CREATE INDEX idx_opps_timestamp ON opportunities(timestamp)")
```

#### Mainnet Upgrade Path

```python
# Devnet: SQLite
from supabase import create_client
db = sqlite3.connect(":memory:")

# Mainnet: Supabase (PostgreSQL + real-time)
db = create_client(SUPABASE_URL, SUPABASE_KEY)
db.table("trades").on_postgres_changes(
    event="INSERT",
    schema="public",
    table="trades",
    callback=on_new_trade
).subscribe()
```

#### Acceptance Criteria
- ✅ SQLite database initializes with all 5 tables
- ✅ Trades recorded correctly with reasoning hash (SHA-256)
- ✅ Vector embeddings generated for 100+ test trades
- ✅ RAG retrieval returns top-5 similar trades (>0.7 cosine similarity)
- ✅ Query performance <500ms for 10K embeddings
- ✅ Database backup/recovery mechanism defined
- ✅ Schema compatible with Supabase migration path

---

## 4️⃣ FRONTEND ENGINEERING (Next.js + React)

### Task FE-01: Wallet Connection & Vault Operations
**Priority:** P0 | **Owner:** Frontend Lead | **Duration:** 1.5 days | **Deps:** SC-02

#### Objective
Build wallet connection and core vault deposit/withdraw UI.

#### Components

**1. Wallet Connect Button**
```typescript
// components/WalletConnect.tsx
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletConnect() {
  return (
    <div className="flex items-center gap-4">
      <WalletMultiButton />
      {connected && <ConnectedWalletInfo />}
    </div>
  );
}
```

Features:
- Detects: Phantom, Solflare, Backpack
- Mobile: Supports Phantom iOS in-app browser
- Fallback: Shows "Install Wallet" for unsupported wallets

**2. Vault Deposit Modal**
```typescript
// components/DepositModal.tsx
interface DepositFormData {
  amount: number;
  currency: "SOL" | "USDC";
}

export function DepositModal({ isOpen, onClose }: Props) {
  const { publicKey, sendTransaction } = useWallet();
  const [formData, setFormData] = useState<DepositFormData>({ amount: 0, currency: "SOL" });
  const [txPending, setTxPending] = useState(false);

  const handleDeposit = async () => {
    // 1. Estimate balance
    const balance = await connection.getBalance(publicKey);
    if (formData.currency === "SOL" && formData.amount * 1e9 > balance) {
      alert("Insufficient SOL");
      return;
    }

    // 2. Build transaction
    const tx = new Transaction();
    tx.add(
      await program.methods
        .deposit(new BN(formData.amount * 1e9))
        .accounts({
          user: publicKey,
          vaultPda: vault_pda,
          userTokenAccount: user_token_account,
          // ... other accounts ...
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()
    );

    // 3. Send transaction
    setTxPending(true);
    try {
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      alert("Deposit successful!");
      onClose();
    } catch (err) {
      alert(`Deposit failed: ${err.message}`);
    } finally {
      setTxPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit to Arbet Vault</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label>Amount</label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              placeholder="0.0"
            />
          </div>
          <div>
            <label>Currency</label>
            <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v as "SOL" | "USDC" })}>
              <SelectItem value="SOL">SOL</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
            </Select>
          </div>
          <Button onClick={handleDeposit} disabled={txPending}>
            {txPending ? "Confirming..." : "Deposit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**3. Vault Overview Panel**
```typescript
// components/VaultOverview.tsx
export function VaultOverview({ vaultAddress }: Props) {
  const [vaultData, setVaultData] = useState<VaultPDA | null>(null);

  useEffect(() => {
    const fetchVault = async () => {
      const account = await connection.getAccountInfo(vaultAddress);
      const decoded = program.account.vaultPda.decode(account.data);
      setVaultData(decoded);
    };
    fetchVault();
  }, [vaultAddress]);

  if (!vaultData) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Vault</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-sm text-gray-500">Vault Address</span>
          <p className="font-mono text-sm break-all">
            {vaultAddress.toBase58()}
            <CopyButton value={vaultAddress.toBase58()} />
            <ExplorerLink address={vaultAddress} />
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">TVL</span>
          <p className="text-2xl font-bold">${(vaultData.depositAmount / 1e9).toFixed(2)}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Share Balance</span>
          <p>{vaultData.shareTokens}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Design System
- **Typography:** Inter font (Google Fonts CDN)
- **Colors:** Dark navy (#0D1F3C) + electric blue (#2A7AE4) + teal (#00C49A)
- **Layout:** 12-column CSS Grid; mobile breakpoints at 640px, 1024px, 1440px
- **Components:** shadcn/ui (Card, Dialog, Button, Input, Select, etc.)
- **Accessibility:** WCAG 2.1 AA (4.5:1 contrast, keyboard nav, ARIA labels)

#### Acceptance Criteria
- ✅ Wallet connects in <3 seconds
- ✅ Deposit modal accepts SOL or USDC
- ✅ Transaction confirms within <5 seconds
- ✅ Vault PDA created on-chain (verifiable in explorer)
- ✅ Dashboard reflects new balance after deposit
- ✅ Mobile responsive (tested on Phantom iOS)
- ✅ All input fields have clear error messages

---

### Task FE-02: Real-Time Agent Dashboard
**Priority:** P0 | **Owner:** Frontend Lead | **Duration:** 2 days | **Deps:** FE-01, BACKEND (all agents)

#### Objective
Build the live monitoring dashboard with WebSocket real-time updates.

#### Components

**1. Agent Status Cards (4x)**
```typescript
// components/AgentStatus.tsx
interface AgentStatusProps {
  agent: "Scout" | "Forecaster" | "Coordinator" | "Executor";
  status: "idle" | "scanning" | "executing" | "error";
  lastUpdate: number;
  metrics: Record<string, number | string>;
}

export function AgentStatusCard({ agent, status, lastUpdate, metrics }: AgentStatusProps) {
  const statusColor = { idle: "gray", scanning: "blue", executing: "green", error: "red" }[status];

  return (
    <Card className="border-l-4" style={{ borderLeftColor: statusColor }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {agent}
          <Badge variant={statusColor}>{status}</Badge>
        </CardTitle>
        <CardDescription>
          Last update: {new Date(lastUpdate).toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <dt className="text-sm text-gray-500">{key}</dt>
              <dd className="font-mono text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
```

**2. Live Opportunity Feed**
```typescript
// components/OpportunityFeed.tsx
export function OpportunityFeed() {
  const [opportunities, setOpportunities] = useState<RawOpportunity[]>([]);

  useAgentStream((message) => {
    if (message.type === "opportunities") {
      setOpportunities((prev) => [message.data, ...prev].slice(0, 50)); // Keep last 50
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {opportunities.map((opp, idx) => (
            <div key={idx} className="p-2 bg-gray-100 rounded text-sm">
              <div className="font-mono">{opp.market_a} ↔ {opp.market_b}</div>
              <div className="text-gray-600">Spread: {opp.spread_bps}bps ({opp.spread_bps / 100}%)</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**3. Agent Reasoning Log**
```typescript
// components/ReasoningLog.tsx
export function ReasoningLog() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useAgentStream((message) => {
    if (message.type === "log") {
      setLogs((prev) => [...prev, message.data].slice(-1000)); // Max 1000 lines
    }
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Reasoning Log</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-gray-900 text-green-400 p-4 rounded max-h-96 overflow-y-auto text-xs font-mono">
          {logs.map((log, idx) => (
            <div key={idx} className={`text-${getColorForLevel(log.level)}`}>
              [{log.timestamp.toLocaleTimeString()}] [{log.agent}] {log.message}
            </div>
          ))}
          <div ref={endRef} />
        </pre>
      </CardContent>
    </Card>
  );
}
```

**4. PnL Dashboard Chart**
```typescript
// components/PnLChart.tsx
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function PnLChart() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    fetch("/api/trades").then((res) => res.json()).then(setTrades);
  }, []);

  const chartData = trades.map((trade) => ({
    timestamp: trade.timestamp,
    cumulativePnL: trades.filter((t) => t.timestamp <= trade.timestamp)
      .reduce((sum, t) => sum + t.edge_bps, 0),
    edge: trade.edge_bps,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>PnL Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <AreaChart data={chartData}>
              <Area yAxisId="left" type="monotone" dataKey="cumulativePnL" fill="#8884d8" />
            </AreaChart>
            <LineChart data={chartData}>
              <Line yAxisId="right" type="monotone" dataKey="edge" stroke="#82ca9d" />
            </LineChart>
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

**5. Trade History Table**
```typescript
// components/TradeHistory.tsx
export function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [sortBy, setSortBy] = useState<"timestamp" | "pnl" | "edge">("timestamp");

  useEffect(() => {
    fetch("/api/trades").then((res) => res.json()).then(setTrades);
  }, []);

  const sortedTrades = [...trades].sort((a, b) => {
    if (sortBy === "timestamp") return b.timestamp - a.timestamp;
    if (sortBy === "pnl") return b.edge_bps - a.edge_bps;
    return b.edge_bps - a.edge_bps;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => setSortBy("timestamp")} className="cursor-pointer">
                Timestamp {sortBy === "timestamp" && "↓"}
              </TableHead>
              <TableHead>Markets</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead onClick={() => setSortBy("edge")} className="cursor-pointer">
                Edge {sortBy === "edge" && "↓"}
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Explorer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTrades.map((trade) => (
              <TableRow key={trade.trade_id}>
                <TableCell>{new Date(trade.timestamp).toLocaleString()}</TableCell>
                <TableCell className="font-mono text-sm">
                  {trade.market_a} ↔ {trade.market_b}
                </TableCell>
                <TableCell>{(trade.amount_in / 1e9).toFixed(2)} SOL</TableCell>
                <TableCell className={trade.edge_bps > 0 ? "text-green-600" : "text-red-600"}>
                  {(trade.edge_bps / 100).toFixed(2)}%
                </TableCell>
                <TableCell>
                  <Badge>{trade.tx_signature ? "Confirmed" : "Pending"}</Badge>
                </TableCell>
                <TableCell>
                  {trade.tx_signature && (
                    <ExplorerLink txSignature={trade.tx_signature} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

**6. Emergency Pause Button**
```typescript
// components/EmergencyPause.tsx
export function EmergencyPause({ vaultAddress, isPaused }: Props) {
  const { publicKey, sendTransaction } = useWallet();
  const [pending, setPending] = useState(false);

  const handleTogglePause = async () => {
    setPending(true);
    try {
      const tx = new Transaction();
      tx.add(
        await program.methods
          [isPaused ? "resumeSwarm" : "emergencyPause"]()
          .accounts({
            caller: publicKey,
            vaultPda: vaultAddress,
          })
          .instruction()
      );

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig);
      alert("Swarm paused successfully");
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      onClick={handleTogglePause}
      disabled={pending}
      variant={isPaused ? "default" : "destructive"}
      size="lg"
    >
      {isPaused ? "▶ RESUME AGENTS" : "⏸ PAUSE AGENTS"}
    </Button>
  );
}
```

#### WebSocket Integration

**Custom Hook: useAgentStream()**
```typescript
// hooks/useAgentStream.ts
import { useEffect, useState } from "react";

export function useAgentStream(onMessage: (msg: AgentStreamMessage) => void) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`${BACKEND_URL}/ws/agents`);

    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };
    ws.onerror = () => setConnected(false);

    // Fallback to REST polling if WebSocket unavailable
    const fallbackInterval = setInterval(() => {
      fetch("/api/agent-status")
        .then((res) => res.json())
        .then((data) => onMessage({ type: "status", data }));
    }, 10000); // Poll every 10s

    return () => {
      ws.close();
      clearInterval(fallbackInterval);
    };
  }, [onMessage]);

  return connected;
}
```

#### Acceptance Criteria
- ✅ WebSocket connects in <1 second
- ✅ Agent logs stream in real-time (<500ms latency)
- ✅ PnL chart updates per trade
- ✅ Opportunity feed refreshes every 10–30s
- ✅ Pause button works; resumes available to owner
- ✅ Mobile responsive (tested on standard devices)
- ✅ Lighthouse performance score >90

---

### Task FE-03: Risk Settings & Configuration UI
**Priority:** P1 | **Owner:** Frontend Lead | **Duration:** 1 day | **Deps:** FE-02, SC-02

#### Objective
Build settings panel for risk parameter configuration.

#### Components

**Risk Settings Form**
```typescript
// components/RiskSettings.tsx
interface RiskConfig {
  max_position_bps: number;
  max_drawdown_bps: number;
  slippage_bps: number;
  min_edge_bps: number;
}

export function RiskSettings({ vaultAddress }: Props) {
  const [config, setConfig] = useState<RiskConfig>(DEFAULT_CONFIG);
  const [pending, setPending] = useState(false);

  const handleSave = async () => {
    setPending(true);
    try {
      const tx = new Transaction();
      tx.add(
        await program.methods
          .updateConfig({
            maxPositionBps: config.max_position_bps,
            maxDrawdownBps: config.max_drawdown_bps,
            slippageBps: config.slippage_bps,
            minEdgeBps: config.min_edge_bps,
          })
          .accounts({
            admin: publicKey,
            globalConfig: GLOBAL_CONFIG_PDA,
          })
          .instruction()
      );

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig);
      alert("Settings updated!");
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label>Max Position Size (% of vault)</label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.max_position_bps / 100]}
              onValueChange={(v) => setConfig({ ...config, max_position_bps: v[0] * 100 })}
              min={0}
              max={50}
              step={1}
            />
            <span className="font-mono">{(config.max_position_bps / 100).toFixed(1)}%</span>
          </div>
        </div>

        <div>
          <label>Max Drawdown (% of initial)</label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.max_drawdown_bps / 100]}
              onValueChange={(v) => setConfig({ ...config, max_drawdown_bps: v[0] * 100 })}
              min={0}
              max={20}
              step={0.5}
            />
            <span className="font-mono">{(config.max_drawdown_bps / 100).toFixed(2)}%</span>
          </div>
        </div>

        <div>
          <label>Max Slippage (bps)</label>
          <Input
            type="number"
            value={config.slippage_bps}
            onChange={(e) => setConfig({ ...config, slippage_bps: parseInt(e.target.value) })}
          />
        </div>

        <div>
          <label>Min Edge (bps)</label>
          <Input
            type="number"
            value={config.min_edge_bps}
            onChange={(e) => setConfig({ ...config, min_edge_bps: parseInt(e.target.value) })}
          />
        </div>

        <Button onClick={handleSave} disabled={pending} className="w-full">
          {pending ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### Acceptance Criteria
- ✅ Settings form displays current on-chain config
- ✅ Updates trigger update_config instruction
- ✅ Values validated on-chain (bounds checking)
- ✅ Confirmation message after successful update
- ✅ Mobile responsive sliders/inputs

---

## 5️⃣ INTEGRATION & DEPLOYMENT

### Task INT-01: End-to-End Trade Execution Flow
**Priority:** P0 | **Owner:** Tech Lead | **Duration:** 1.5 days | **Deps:** All prior tasks

#### Objective
Integrate all components into a repeatable, auditable trade execution demo.

#### Workflow to Verify

```
┌───────────────────────────────────────┐
│ 1. User Deposits SOL                  │
│ Frontend: Connect wallet → Deposit    │
│ Smart Contract: initialize_vault +    │
│ deposit instructions                  │
│ Result: Vault PDA created on-chain    │
└────────────┬────────────────────────┘
             ↓ (Wait 2 slots)
┌────────────────────────────────────────┐
│ 2. Scout Agent Polls Markets           │
│ Python Backend: Capitola + Polymarket  │
│ Result: 5+ opportunities detected      │
└────────────┬────────────────────────┘
             ↓ (Every 10–30s)
┌────────────────────────────────────────┐
│ 3. Forecaster Agent Scores Top Opp     │
│ Python Backend: Apply correlated logic │
│ Result: Edge estimate, confidence      │
└────────────┬────────────────────────┘
             ↓ (1–2s)
┌────────────────────────────────────────┐
│ 4. Coordinator Validates Risk          │
│ Python Backend: Check position size,   │
│ drawdown, correlation                  │
│ Result: Approved or Veto'd             │
└────────────┬────────────────────────┘
             ↓ (1–2s if approved)
┌────────────────────────────────────────┐
│ 5. Executor Builds & Simulates Bundle  │
│ Python Backend: Jito bundle creation   │
│ Result: simulateBundle succeeds        │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 6. Executor Submits Bundle to Network  │
│ Python Backend: jito-py send           │
│ Result: TX signature returned          │
└────────────┬────────────────────────┘
             ↓ (Confirm in <5s)
┌────────────────────────────────────────┐
│ 7. TradeLog PDA Created On-Chain       │
│ Smart Contract: record_trade called    │
│ Result: Verifiable in Solana explorer  │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 8. Helius Webhook Fires                │
│ Notification: TradeLog account change  │
│ Result: Next.js API receives event     │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 9. Dashboard Updates in Real-Time      │
│ Frontend: WebSocket broadcasts         │
│ Result: Trade appears in history,      │
│ PnL updates, reasoning logged          │
└────────────┬────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 10. User Verifies on Solana Explorer   │
│ Frontend: Link to TX + TradeLog PDA    │
│ Result: Audit trail complete          │
└────────────────────────────────────────┘
```

#### Testing Checklist

**Functional Tests:**
- [ ] Wallet connect → PDA created → deposit succeeds
- [ ] Scout fetches prices from 3 platforms
- [ ] Forecaster scores 5+ opportunities per hour
- [ ] Coordinator approves valid trade (position size OK)
- [ ] Executor builds valid Jito bundle
- [ ] simulateBundle succeeds
- [ ] TX confirmed on-chain in <5s
- [ ] TradeLog PDA visible in Solana explorer
- [ ] Frontend dashboard updates within <500ms
- [ ] Reasoning log shows all agent decisions

**Failure Scenarios:**
- [ ] Slippage exceeds threshold → Trade aborted
- [ ] Vault paused → execute_arb rejected on-chain
- [ ] Drawdown exceeded → Circuit breaker triggers
- [ ] Public RPC rate-limited → Helius fallback works
- [ ] LLM output invalid JSON → Retry with temperature=0
- [ ] Jito bundle unavailable → Fallback to direct RPC

**Performance Benchmarks:**
- [ ] Latency: Detect → Approve → Execute <8s (target)
- [ ] Scout polling: 10–30s interval maintained
- [ ] Forecaster reasoning: <4s per opportunity
- [ ] Executor simulation: <2s
- [ ] Dashboard update: <500ms WebSocket latency
- [ ] LLM inference: Qwen3-8B 40–60 tokens/sec (CPU)

**Audit & Verification:**
- [ ] All TXs verifiable in Solana explorer
- [ ] TradeLog PDAs immutable (on-chain record)
- [ ] Reasoning hash matches off-chain logs (SHA-256)
- [ ] No funds lost in any failure scenario
- [ ] Full audit trail: on-chain + off-chain logs

#### Acceptance Criteria
- ✅ Wallet deposit → on-chain vault creation in <5s
- ✅ Scout detects 5+ opportunities per hour
- ✅ Forecaster edge estimates within ±10% of actual
- ✅ Executor successfully submits 10+ trades to devnet
- ✅ All TradeLog PDAs verifiable in explorer
- ✅ Frontend dashboard updates in real-time (<500ms latency)
- ✅ System survives 1+ hour continuous operation
- ✅ No funds lost in any failure scenario
- ✅ Complete audit trail on-chain + off-chain

---

## 6️⃣ CRITICAL MISSING REQUIREMENTS & AMBIGUITIES

### ❓ Questions Requiring Clarification

| ID | Question | Impact | Recommendation |
|---|---|---|---|
| **OQ-01** | Autonomous vs. user-approved multisig for execute_arb? | High | **Decision: Option A for hackathon** (fully autonomous, agent hot wallet). Mainnet: Option B (2/2 multisig with Squads). |
| **OQ-02** | Local Ollama only vs. Groq free-tier fallback? | Medium | **Decision: Option A primary** (Ollama, zero cost). Groq as fallback for machines <8GB RAM. |
| **OQ-03** | How many correlated event clusters in MVP? | Medium | **Decision: Option B (2 clusters)** — US politics + crypto. Provides demo variety without exceeding dev time. |
| **OQ-04** | Mock event token program vs. Hedgehog CPI? | Medium | **Decision: Option A (mock) for Day 1–10**. Hedgehog CPI added if devnet stable by Day 8. |
| **OQ-05** | SQLite vs. Chroma for vector store? | Low | **Decision: Option A (SQLite-vec)**. Sufficient for <10K embeddings; eliminates Docker dependency. |
| **OQ-06** | Performance fee model on mainnet? | High | **Decision: 0% for devnet/beta**. Option B (2% of profits) for mainnet v1. |
| **OQ-07** | Agent hot wallet key storage on mainnet? | Critical | **Decision: Option B (AWS Secrets Manager)** for mainnet. Devnet: .env file (local, .gitignored). |
| **OQ-08** | Surfpool for fully offline demo? | Low | **Decision: Option B (local Surfpool validator)** as fallback. Setup by Day 13. |

---

### 🚨 Ambiguous Requirements

| Area | Issue | Clarification Needed | Proposed Resolution |
|---|---|---|---|
| **Market Data Sources** | Capitola API documentation sparse | Exact endpoint format, rate limits, auth | Use public Capitola explorer + reverse-engineer API; fallback to Polymarket only |
| **Hedgehog Integration** | Devnet deployment status unclear | Is Hedgehog available on devnet? Endpoint? | Confirm devnet status by Day 4; use mock program if unavailable |
| **Pyth Devnet Feeds** | Which 500+ feeds available on devnet? | Are stock/commodity feeds available? | Check Pyth devnet registry; focus on crypto + major indices if limited |
| **Jito Devnet Bundle API** | simulateBundle compatibility with devnet? | Is bundle fee estimation accurate on devnet? | Test devnet simulateBundle by Day 8; document any divergence from mainnet |
| **Vault Share Price Calculation** | When is NAV updated? | Per trade? Per epoch? Real-time? | **Decision: Update per trade** (executed immediately on TradeLog creation) |
| **Agent Pause Semantics** | Does pause block future opportunities detection or just execution? | Can Scout/Forecaster run while paused? | **Decision: Pause blocks execute_arb only** (Scout/Forecaster continue; Executor skips) |
| **Circuit Breaker Trigger** | Is drawdown absolute or cumulative since launch? | How is initial NAV set? | **Decision: Cumulative since vault creation**. Initial NAV = initial deposit. |
| **RAG Context Size** | How many similar trades injected into prompt? | What if <5 similar trades exist? | Inject top-N (min 1) similar trades; if none, Forecaster proceeds without RAG context |
| **WebSocket Fallback Latency** | If WebSocket fails, how stale is REST polling data? | 10s interval acceptable? | **Decision: 10s REST fallback**. Log every WebSocket disconnection for debugging. |

---

## 7️⃣ EXECUTION TIMELINE — 14-DAY SPRINT

### **Days 1–2: Smart Contract Foundation**
- [ ] SC-01: Anchor program skeleton
- [ ] Initialize Anchor project, create PDAs, deposit/withdraw
- [ ] **Deliverable:** Deployable to devnet; IDL generated

### **Days 3–4: Smart Contract Core + Data Layer**
- [ ] SC-02: Trade execution & risk controls
- [ ] SC-03: Security hardening & testing
- [ ] DATA-01: SQLite setup & RAG
- [ ] **Deliverable:** execute_arb, record_trade, emergency_pause all working; DB initialized

### **Days 4–5: Scout Agent**
- [ ] AG-01: Scout agent implementation
- [ ] Integrate Capitola, Polymarket, Hedgehog, Pyth data sources
- [ ] **Deliverable:** Scout polling every 10–30s; 5+ opportunities/hour detected

### **Days 6–7: Forecaster Agent**
- [ ] AG-02: Forecaster with 4 correlated event classes
- [ ] RAG integration + confidence scoring
- [ ] **Deliverable:** Forecaster scores opportunities; RAG context injected

### **Days 8–9: Executor Agent + LangGraph Orchestration**
- [ ] AG-03: Executor agent (bundle building, simulation, submission)
- [ ] AG-05: LangGraph integration (all 4 agents in graph)
- [ ] **Deliverable:** Full agent swarm running end-to-end; first devnet trades executed

### **Days 10–11: Frontend (Wallet + Dashboard)**
- [ ] FE-01: Wallet connection & vault operations
- [ ] FE-02: Real-time agent dashboard
- [ ] WebSocket integration + fallback to REST
- [ ] **Deliverable:** Next.js deployed on Vercel; live agent monitoring

### **Days 12–13: Coordinator Agent + Risk Settings + Integration**
- [ ] AG-04: Coordinator agent (risk governance)
- [ ] FE-03: Risk settings panel
- [ ] INT-01: End-to-end trade execution flow testing
- [ ] **Deliverable:** Full stack working; 10+ repeatable trade cycles verified

### **Day 14: Polish, Documentation, Final Testing**
- [ ] README with local setup instructions
- [ ] Demo video recorded
- [ ] All devnet TXs verifiable in Solana explorer
- [ ] PRD + architecture diagrams finalized
- [ ] **Deliverable:** Hackathon submission ready; judges can run locally

---

## 8️⃣ SUCCESS CRITERIA & DEMO NARRATIVE

### **Must-Have for Judges (P0)**
1. ✅ **Wallet connection**: User connects → vault created on-chain (explorer-verifiable)
2. ✅ **Live agent monitoring**: Real-time dashboard shows all 4 agents running
3. ✅ **Correlated event detection**: Forecaster demonstrates probability incoherence or cross-platform spread detection
4. ✅ **Atomic trade execution**: Jito bundle submitted; TradeLog PDA created; verified in explorer
5. ✅ **Transparent reasoning**: Agent logs visible in real-time showing "I saw this spread → I scored it → I got approval → I executed"
6. ✅ **Risk enforcement**: Circuit breaker triggers when drawdown exceeded; demonstrate pause/resume

### **Demo Narrative (5-minute walkthrough)**

```
[Judge watches laptop screen]

Minute 1: SETUP
  "Here's Arbet Agents running on Solana Devnet. This is our agent swarm
   monitoring prediction markets 24/7. Let me connect a wallet and deposit."
  [Click "Connect Wallet" → Phantom opens → Approve → Vault PDA created]
  [Deposit 1 SOL → TX confirmed in <5s]

Minute 2: SCOUT AGENT
  "Now watch the Scout agent. Every 10–30 seconds, it polls Capitola and
   Polymarket for price data. See here — it just detected a 5% spread
   between two correlated markets."
  [Live opportunity feed shows: "Market A: 45% bid/52% ask | Market B: 40% bid/48% ask"]
  [Agent logs: "[Scout] Fetched 7 opportunities; max spread 520bps on SOL>$200"]

Minute 3: FORECASTER & COORDINATOR
  "The Forecaster agent receives this raw spread. It's not just a simple
   arbitrage — it applies our correlated event logic. The markets are for
   related events (SOL price thresholds). Probability mismatch = 5% profit edge.
   The Coordinator checks: Is our vault large enough? Are we below max drawdown?
   Yes → Approved."
  [Dashboard shows: "Forecaster confidence: 0.87 | Edge: 520bps | Position: 0.5% of vault"]
  [Coordinator: "✓ Approved (position size OK, drawdown 0.2%)"]

Minute 4: EXECUTOR & ON-CHAIN VERIFICATION
  "The Executor builds a Jito bundle—both legs of the arbitrage in one atomic
   transaction. Watch: it simulates first, confirms slippage is <1.5%, then submits."
  [Executor logs: "Building bundle... Simulating... Submitting to Jito..."]
  [TX signature appears: 3X7k9mK...2p (truncated)]
  "Let me pull up Solana explorer to show you the on-chain proof."
  [Open Solana explorer, paste TX signature]
  "Here's our transaction. See the Arbet program instruction? And the TradeLog PDA
   created with the trade details. Reasoning hash recorded for audit trail."

Minute 5: DASHBOARD & TRANSPARENCY
  "Watch the dashboard update in real-time. PnL chart ticks up by the edge we captured.
   Trade history now shows this execution with full reasoning trail. This is the
   wow-factor: judges can see the AI's thinking process, not just the outcome.
   [Dashboard PnL chart refreshes]
   [Trade history table shows: "Market A ↔ B | 520bps captured | Reasoning: [corr event incoherence] | Explorer link"]

[Judge nods, impressed by transparency and autonomy]
```

---

## 9️⃣ DEPENDENCIES & CRITICAL PATH

```
┌─────────────────────────────────────────────────────────┐
│ SC-01: Foundation (2d)                                   │
└────────────────┬────────────────────────────────────────┘
                 ↓
       ┌─────────────────────────────────────────────────┐
       │ SC-02: Core Logic (1d) ← SC-03: Security (1d) │
       └────────┬────────────────────────────────────────┘
                ↓
       ┌────────────────────────────────────┐
       │ DATA-01: SQLite (1d)               │
       │ AG-01: Scout (2d)                 │
       │ FE-01: Wallet (1.5d)              │
       └────────┬────────────────────────┬─┘
                ↓                        ↓
       ┌──────────────────┐      ┌──────────────────┐
       │ AG-02: Forecaster│      │ FE-02: Dashboard │
       │      (2d)        │      │      (2d)        │
       └─────────┬────────┘      └──────────────────┘
                 ↓
       ┌──────────────────┐
       │ AG-03: Executor  │
       │      (2d)        │
       └─────────┬────────┘
                 ↓
       ┌──────────────────┐
       │ AG-04: Coordinator
       │      (1.5d)      │
       └─────────┬────────┘
                 ↓
       ┌──────────────────┐
       │ AG-05: LangGraph │
       │  Orchestration   │
       │      (1.5d)      │
       └─────────┬────────┘
                 ↓
       ┌──────────────────┐
       │ FE-03: Risk UI   │
       │      (1d)        │
       └─────────┬────────┘
                 ↓
       ┌──────────────────┐
       │ INT-01: E2E Flow │
       │      (1.5d)      │
       └──────────────────┘

CRITICAL PATH (14 days):
  SC-01 (2d) → SC-02 (1d) → AG-01 (2d) → AG-02 (2d) →
  AG-03 (2d) → AG-04 (1.5d) → AG-05 (1.5d) → INT-01 (1.5d) = 14 days

PARALLEL TRACKS:
  - SC track: SC-01 → SC-02 → SC-03 (4 days)
  - Agent track: AG-01 → AG-02 → AG-03 → AG-04 → AG-05 (9.5 days)
  - Frontend track: FE-01 → FE-02 (3.5 days, starts Day 4)
  - Data track: DATA-01 (Day 1, used by AG-02)
```

---

## 🔟 TEAM ALLOCATION & RESPONSIBILITIES

### **Smart Contract Team (1–2 engineers)**
- **Lead:** Smart Contract Engineer
- **Tasks:** SC-01, SC-02, SC-03
- **Deliverables:** Deployable Anchor program; IDL; security audit checklist
- **Milestones:**
  - Day 2: SC-01 complete → deployable skeleton
  - Day 3: SC-02 complete → all trading instructions working
  - Day 4: SC-03 complete → security hardened, tested

### **Agent Backend Team (2–3 engineers)**
- **Lead:** Agent Backend Lead
- **Tasks:** AG-01, AG-02, AG-03, AG-04, AG-05
- **Subtasks:**
  - Engineer 1: AG-01 (Scout) + AG-05 (LangGraph orchestration)
  - Engineer 2: AG-02 (Forecaster) + AG-04 (Coordinator)
  - Engineer 3: AG-03 (Executor) + tools/utilities
- **Deliverables:** 4-agent swarm; LangGraph graph; SQLite setup
- **Milestones:**
  - Day 5: AG-01 complete → Scout fetching prices
  - Day 7: AG-02 complete → Forecaster scoring
  - Day 9: AG-03 + AG-05 complete → full swarm running end-to-end
  - Day 12: AG-04 complete → risk governance enforced

### **Frontend Team (1–2 engineers)**
- **Lead:** Frontend Lead
- **Tasks:** FE-01, FE-02, FE-03
- **Deliverables:** Next.js dashboard; wallet integration; WebSocket streaming
- **Milestones:**
  - Day 5: FE-01 complete → wallet connect + deposit/withdraw working
  - Day 7: FE-02 complete → real-time dashboard deployed
  - Day 10: FE-03 complete → risk settings panel

### **Integration & DevOps (1 engineer)**
- **Lead:** Tech Lead
- **Tasks:** INT-01, deployment pipeline, documentation
- **Deliverables:** End-to-end test harness; demo script; README
- **Milestones:**
  - Day 10: Local dev environment documented
  - Day 13: End-to-end tests passing; demo video recorded
  - Day 14: Final submission package ready

---

## 1️⃣1️⃣ DEPLOYMENT CHECKLIST

### **Devnet MVP (Days 1–14)**
- [ ] All Anchor programs deployed to devnet
- [ ] Helius free tier (1M credits) configured
- [ ] Ollama running with Qwen3-8B model
- [ ] SQLite database initialized
- [ ] Next.js frontend deployed to Vercel
- [ ] All 4 agents running in LangGraph
- [ ] WebSocket connection stable
- [ ] 10+ successful trade cycles executed
- [ ] All TXs verifiable in Solana explorer
- [ ] Agent logs complete and auditable

### **Pre-Hackathon Submission**
- [ ] README.md with:
  - Local setup instructions (5 min setup time)
  - Demo walkthrough (5 min execution time)
  - Troubleshooting guide
- [ ] Architecture diagram (System architecture & data flow)
- [ ] Demo video (5 minutes, showing full trade execution)
- [ ] Technical glossary (from PRD Section 15)
- [ ] Risk register (from PRD Appendix B)
- [ ] Open questions documented (Section 6 above)

---

## 1️⃣2️⃣ SUCCESS METRICS (Hackathon)

| Metric | Target | Measurement |
|---|---|---|
| **Code Quality** | Zero Anchor security warnings | anchor-lint + manual review |
| **Agent Reliability** | >95% trade execution success | Count(successful) / Count(attempted) |
| **System Latency** | Detect → Execute <8s | LangGraph timestamps |
| **Data Accuracy** | Edge estimates ±10% | Simulated vs. actual edge comparison |
| **Uptime** | 1+ hour continuous operation | No crashes; all components running |
| **Transparency** | 100% reasoning logged | Every decision traceable to-chain |
| **User Experience** | <3s wallet connect; <5s deposit confirm | Timer measurements |
| **Dashboard** | <500ms WebSocket latency | Performance.now() timestamp deltas |

---

**Document prepared for Hackathon Team | April 14, 2026**

All timelines, task dependencies, and acceptance criteria are based on PRD v2.0 (April 12, 2026).

For questions or blocking issues, escalate to Tech Lead immediately.

**Next step:** Assign tasks to engineers; kick off Day 1 standup.
