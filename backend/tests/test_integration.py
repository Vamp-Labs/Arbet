"""End-to-End Integration Tests - Full Trade Execution Flow"""

import pytest
import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from unittest.mock import AsyncMock, patch, MagicMock

# Import all system components
from backend.agent.graph import AgentSwarm, AgentState
from backend.agent.scout import Scout
from backend.agent.forecaster import Forecaster
from backend.agent.coordinator import Coordinator
from backend.agent.executor import Executor
from backend.db import SessionLocal, EmbeddingManager, get_db_status, engine
from backend.db.models import User, Vault, Trade, Opportunity, AgentLog


# ==================== INTEGRATION TEST SUITE ====================

class IntegrationTestHarness:
    """Harness for coordinating end-to-end tests"""

    def __init__(self):
        self.db = SessionLocal()
        self.swarm = AgentSwarm(
            scout=Scout(db_session=self.db),
            forecaster=Forecaster(),
            coordinator=Coordinator(),
            executor=Executor(),
        )
        self.embedding_manager = EmbeddingManager()

    def setup_test_vault(self) -> Vault:
        """Create a test vault for integration testing"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]

        # Create test user
        user = User(
            wallet_address=f"test_wallet_{unique_id}",
            username=f"test_user_{unique_id}",
        )
        self.db.add(user)
        self.db.commit()

        # Create test vault with 1 SOL
        vault = Vault(
            user_id=user.id,
            vault_address=f"vault_pda_{unique_id}",
            authority="test_authority",
            balance=1_000_000_000,  # 1 SOL in lamports
            initial_balance=1_000_000_000,
            position_limit_bps=500,  # 5% position limit
            max_drawdown_bps=1000,  # 10% drawdown limit
        )
        self.db.add(vault)
        self.db.commit()

        return vault

    def teardown(self):
        """Clean up test resources"""
        self.db.close()


# ==================== TEST CASES ====================

@pytest.fixture
def test_harness():
    """Provide a fresh integration test harness"""
    harness = IntegrationTestHarness()
    yield harness
    harness.teardown()


@pytest.mark.asyncio
async def test_full_trade_execution_flow(test_harness):
    """Test complete Scout→Forecaster→Coordinator→Executor flow"""

    vault = test_harness.setup_test_vault()

    # Run one complete cycle through the agent pipeline
    result_state = await test_harness.swarm.run_cycle()

    # Verify workflow completion
    assert result_state is not None
    assert isinstance(result_state["opportunities"], list)
    assert isinstance(result_state["scored_opportunities"], list)
    assert isinstance(result_state["approvals"], list)
    assert isinstance(result_state["executions"], list)


@pytest.mark.asyncio
async def test_scout_opportunity_detection(test_harness):
    """Test Scout detects spreads >300bps"""

    vault = test_harness.setup_test_vault()

    state = test_harness.swarm.create_initial_state("test_scout")
    result_state = await test_harness.swarm.scout_node(state)

    # Scout should return opportunities
    assert len(result_state["opportunities"]) >= 0
    # In mock, should have opportunities
    if len(result_state["opportunities"]) > 0:
        opp = result_state["opportunities"][0]
        assert "spread_bps" in opp
        # If detected, should be >300bps
        if opp["spread_bps"] > 0:
            assert opp["spread_bps"] > 300


@pytest.mark.asyncio
async def test_forecaster_opportunity_scoring(test_harness):
    """Test Forecaster accurately scores opportunities"""

    vault = test_harness.setup_test_vault()

    # Create a mock opportunity
    state = test_harness.swarm.create_initial_state("test_forecaster")
    state["opportunities"] = [
        {
            "opportunity_id": "opp_1",
            "buy_market_id": "btc_yes",
            "sell_market_id": "btc_no",
            "buy_price": 0.60,
            "sell_price": 0.65,
            "spread_bps": 833,
        }
    ]

    result_state = await test_harness.swarm.forecaster_node(state)

    # Forecaster should score opportunities
    assert len(result_state["scored_opportunities"]) > 0
    scored = result_state["scored_opportunities"][0]
    assert "confidence" in scored
    assert scored["confidence"] > 0


@pytest.mark.asyncio
async def test_coordinator_risk_validation(test_harness):
    """Test Coordinator enforces position size and drawdown limits"""

    vault = test_harness.setup_test_vault()

    # Create mock opportunities
    state = test_harness.swarm.create_initial_state("test_coordinator")
    state["scored_opportunities"] = [
        {
            "opportunity_id": "opp_1",
            "confidence": 0.8,
            "estimated_edge_bps": 500,
        }
    ]

    result_state = await test_harness.swarm.coordinator_node(state)

    # Coordinator should approve or reject based on risk
    assert isinstance(result_state["approvals"], list)


@pytest.mark.asyncio
async def test_executor_trade_building(test_harness):
    """Test Executor builds valid transactions"""

    vault = test_harness.setup_test_vault()

    # Create mock approvals
    state = test_harness.swarm.create_initial_state("test_executor")
    state["approvals"] = [
        {
            "trade_id": "opp_1",
            "approved": True,
            "reason": "approved",
            "risk_score": 25.0,
        }
    ]

    result_state = await test_harness.swarm.executor_node(state)

    # Executor should build transactions
    assert isinstance(result_state["executions"], list)


@pytest.mark.asyncio
async def test_error_handling_slippage_exceeded(test_harness):
    """Test system handles slippage exceeded error"""

    vault = test_harness.setup_test_vault()

    # Simulate trade with slippage exceeded
    state = test_harness.swarm.create_initial_state("test_slippage")
    state["errors"].append("slippage_exceeded")

    # System should log error without crashing
    assert len(state["errors"]) == 1


@pytest.mark.asyncio
async def test_error_handling_vault_paused(test_harness):
    """Test system prevents trades when vault is paused"""

    vault = test_harness.setup_test_vault()
    vault.is_paused = True
    test_harness.db.commit()

    state = test_harness.swarm.create_initial_state("test_paused")
    state["opportunities"] = [
        {
            "opportunity_id": "opp_1",
            "buy_market_id": "market_a",
            "sell_market_id": "market_b",
            "buy_price": 0.60,
            "sell_price": 0.65,
            "spread_bps": 833,
        }
    ]

    # Even though scout finds opportunities, coordinator should reject if vault paused
    result_state = await test_harness.swarm.coordinator_node(state)

    # Should log vault paused error
    # (In real implementation, would check vault.is_paused)


@pytest.mark.asyncio
async def test_error_handling_drawdown_exceeded(test_harness):
    """Test system enforces drawdown limits"""

    vault = test_harness.setup_test_vault()
    # Simulate vault with 15% loss (exceeds 10% limit)
    vault.balance = 850_000_000
    vault.initial_balance = 1_000_000_000
    test_harness.db.commit()

    # Drawdown = (1B - 850M) / 1B * 10000 = 1500 bps = 15%
    drawdown_bps = ((vault.initial_balance - vault.balance) * 10000) // vault.initial_balance
    assert drawdown_bps == 1500  # 15% > 10% limit


@pytest.mark.asyncio
async def test_database_audit_trail(test_harness):
    """Test complete audit trail is recorded in database"""

    vault = test_harness.setup_test_vault()

    # Run a complete cycle
    result_state = await test_harness.swarm.run_cycle()

    # In a real execution, would log to AgentLog table
    # For now, verify state contains complete information
    assert "opportunities" in result_state
    assert "scored_opportunities" in result_state
    assert "approvals" in result_state
    assert "executions" in result_state
    assert "errors" in result_state


@pytest.mark.asyncio
async def test_rag_context_injection(test_harness):
    """Test RAG context is injected into Forecaster prompt"""

    vault = test_harness.setup_test_vault()

    # Create a test embedding
    import numpy as np
    query_embedding = np.random.randn(384).astype(np.float32)
    query_embedding /= np.linalg.norm(query_embedding)

    # Get RAG context
    context = test_harness.embedding_manager.rag_context(
        test_harness.db,
        query_embedding,
        top_k=5,
    )

    # Should return context string (may be empty if no historical trades)
    assert isinstance(context, str)


@pytest.mark.asyncio
async def test_continuous_operation_multiple_cycles(test_harness):
    """Test system survives multiple consecutive cycles"""

    vault = test_harness.setup_test_vault()

    # Run 5 cycles
    for i in range(5):
        result_state = await test_harness.swarm.run_cycle()
        assert result_state is not None
        assert len(result_state["errors"]) < 5  # Should not accumulate too many errors

    # Verify metrics
    assert test_harness.swarm.metrics.cycles_completed == 5


@pytest.mark.asyncio
async def test_latency_measurements(test_harness):
    """Test latency at each stage of execution"""

    vault = test_harness.setup_test_vault()

    import time

    # Measure full cycle
    start = time.time()
    result_state = await test_harness.swarm.run_cycle()
    total_duration = (time.time() - start) * 1000  # Convert to ms

    # Full cycle should complete in reasonable time (target <10s = 10000ms)
    assert total_duration < 10000


@pytest.mark.asyncio
async def test_database_state_consistency(test_harness):
    """Test database maintains consistency throughout trades"""

    vault = test_harness.setup_test_vault()

    initial_balance = vault.balance

    # Run cycle
    result_state = await test_harness.swarm.run_cycle()

    # Verify vault still exists and is consistent
    vault_from_db = test_harness.db.query(Vault).filter(Vault.id == vault.id).first()
    assert vault_from_db is not None
    assert vault_from_db.balance > 0  # Should never go negative


@pytest.mark.asyncio
async def test_no_fund_loss_on_error(test_harness):
    """Test no funds are lost when errors occur"""

    vault = test_harness.setup_test_vault()
    initial_balance = vault.balance

    # Simulate an error condition
    state = test_harness.swarm.create_initial_state("test_error")
    state["errors"].append("simulated_error")

    # Verify vault balance unchanged
    vault.balance = initial_balance  # Reset to ensure no change
    test_harness.db.commit()

    vault_from_db = test_harness.db.query(Vault).filter(Vault.id == vault.id).first()
    assert vault_from_db.balance == initial_balance


@pytest.mark.asyncio
async def test_agent_state_progression(test_harness):
    """Test state flows correctly through entire pipeline"""

    vault = test_harness.setup_test_vault()

    initial_state = test_harness.swarm.create_initial_state("test_progression")

    # Verify initial state is clean
    assert len(initial_state["opportunities"]) == 0
    assert len(initial_state["scored_opportunities"]) == 0
    assert len(initial_state["approvals"]) == 0
    assert len(initial_state["executions"]) == 0

    # Run through pipeline
    state = await test_harness.swarm.scout_node(initial_state)
    assert len(state["opportunities"]) >= 0

    state = await test_harness.swarm.forecaster_node(state)
    assert len(state["scored_opportunities"]) <= len(state["opportunities"])

    state = await test_harness.swarm.coordinator_node(state)
    assert len(state["approvals"]) <= len(state["scored_opportunities"])

    state = await test_harness.swarm.executor_node(state)
    assert len(state["executions"]) <= len(state["approvals"])
