"""LangGraph Orchestration - Multi-Agent Swarm Coordination"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Dict, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# State TypedDict for LangGraph
class AgentState(TypedDict):
    """Shared state passed between agent nodes"""
    cycle_id: str
    opportunities: List[Dict[str, Any]]
    scored_opportunities: List[Dict[str, Any]]
    approvals: List[Dict[str, Any]]
    executions: List[Dict[str, Any]]
    errors: List[str]
    cycle_count: int
    started_at: datetime


@dataclass
class AgentMetrics:
    """Metrics tracking for the agent swarm"""
    cycles_completed: int = 0
    total_opportunities: int = 0
    total_scored: int = 0
    total_approved: int = 0
    total_executed: int = 0
    total_errors: int = 0
    started_at: Optional[datetime] = None
    last_cycle_duration_ms: int = 0

    def record_cycle(self, state: AgentState, duration_ms: int):
        """Record metrics from completed cycle"""
        self.cycles_completed += 1
        self.total_opportunities += len(state.get("opportunities", []))
        self.total_scored += len(state.get("scored_opportunities", []))
        self.total_approved += len(state.get("approvals", []))
        self.total_executed += len(state.get("executions", []))
        self.total_errors += len(state.get("errors", []))
        self.last_cycle_duration_ms = duration_ms

    def log_summary(self):
        """Log metrics summary"""
        elapsed = (datetime.now(timezone.utc) - self.started_at).total_seconds() if self.started_at else 0
        logger.info(
            f"Metrics after {self.cycles_completed} cycles ({elapsed:.1f}s): "
            f"opportunities={self.total_opportunities}, scored={self.total_scored}, "
            f"approved={self.total_approved}, executed={self.total_executed}, "
            f"errors={self.total_errors}"
        )


class AgentSwarm:
    """Orchestrator for multi-agent swarm using LangGraph pattern"""

    def __init__(
        self,
        scout=None,
        forecaster=None,
        coordinator=None,
        executor=None,
    ):
        self.scout = scout
        self.forecaster = forecaster
        self.coordinator = coordinator
        self.executor = executor
        self.metrics = AgentMetrics()
        self.metrics.started_at = datetime.now(timezone.utc)

    def create_initial_state(self, cycle_id: str) -> AgentState:
        """Create initial state for a new cycle"""
        return AgentState(
            cycle_id=cycle_id,
            opportunities=[],
            scored_opportunities=[],
            approvals=[],
            executions=[],
            errors=[],
            cycle_count=self.metrics.cycles_completed,
            started_at=datetime.now(timezone.utc),
        )

    async def scout_node(self, state: AgentState) -> AgentState:
        """Scout agent node - detect opportunities"""
        try:
            logger.info(f"[{state['cycle_id']}] Scout: Starting price polling...")

            # In production, call scout.fetch_prices() and detect_spreads()
            # For now, simulate opportunity generation
            opportunities = [
                {
                    "opportunity_id": f"opp_{state['cycle_id']}_1",
                    "buy_market_id": "market_btc_yes",
                    "sell_market_id": "market_btc_no",
                    "buy_price": 0.60,
                    "sell_price": 0.65,
                    "spread_bps": 833,
                },
                {
                    "opportunity_id": f"opp_{state['cycle_id']}_2",
                    "buy_market_id": "market_eth_yes",
                    "sell_market_id": "market_eth_no",
                    "buy_price": 0.55,
                    "sell_price": 0.58,
                    "spread_bps": 545,
                },
            ]

            state["opportunities"] = opportunities
            logger.info(f"[{state['cycle_id']}] Scout: Found {len(opportunities)} opportunities")

            return state

        except Exception as e:
            logger.error(f"[{state['cycle_id']}] Scout node error: {e}")
            state["errors"].append(f"scout_error: {e}")
            return state

    async def forecaster_node(self, state: AgentState) -> AgentState:
        """Forecaster agent node - score opportunities"""
        try:
            logger.info(f"[{state['cycle_id']}] Forecaster: Scoring {len(state['opportunities'])} opportunities...")

            if not state["opportunities"]:
                logger.info(f"[{state['cycle_id']}] Forecaster: No opportunities to score")
                return state

            scored = []
            rejected = 0

            for opp in state["opportunities"]:
                # Simulate scoring
                confidence = 0.75 if opp.get("spread_bps", 0) > 700 else 0.55

                if confidence >= 0.6:
                    scored.append({
                        **opp,
                        "confidence": confidence,
                        "estimated_edge_bps": opp.get("spread_bps", 0),
                        "mispricing_type": "spread",
                        "reasoning": f"Cross-platform spread detected",
                    })
                else:
                    rejected += 1

            state["scored_opportunities"] = scored
            logger.info(
                f"[{state['cycle_id']}] Forecaster: Scored {len(scored)} opportunities "
                f"(rejected {rejected} with low confidence)"
            )

            return state

        except Exception as e:
            logger.error(f"[{state['cycle_id']}] Forecaster node error: {e}")
            state["errors"].append(f"forecaster_error: {e}")
            return state

    async def coordinator_node(self, state: AgentState) -> AgentState:
        """Coordinator agent node - perform risk checks"""
        try:
            logger.info(
                f"[{state['cycle_id']}] Coordinator: Checking {len(state['scored_opportunities'])} trades..."
            )

            if not state["scored_opportunities"]:
                logger.info(f"[{state['cycle_id']}] Coordinator: No trades to approve")
                return state

            approvals = []

            for trade in state["scored_opportunities"]:
                # Simulate approval (all pass in this test)
                approval = {
                    "trade_id": trade.get("opportunity_id"),
                    "approved": True,
                    "reason": "approved",
                    "risk_score": 25.0,
                }
                approvals.append(approval)

            state["approvals"] = approvals
            logger.info(f"[{state['cycle_id']}] Coordinator: Approved {len(approvals)} trades")

            return state

        except Exception as e:
            logger.error(f"[{state['cycle_id']}] Coordinator node error: {e}")
            state["errors"].append(f"coordinator_error: {e}")
            return state

    async def executor_node(self, state: AgentState) -> AgentState:
        """Executor agent node - submit trades"""
        try:
            approved = [a for a in state["approvals"] if a.get("approved")]
            logger.info(f"[{state['cycle_id']}] Executor: Submitting {len(approved)} trades...")

            if not approved:
                logger.info(f"[{state['cycle_id']}] Executor: No approved trades to execute")
                return state

            executions = []

            for approval in approved:
                # Simulate execution
                execution = {
                    "opportunity_id": approval.get("trade_id"),
                    "bundle_id": f"bundle_{state['cycle_id']}",
                    "status": "confirmed",
                    "actual_edge_bps": 800,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                executions.append(execution)

            state["executions"] = executions
            logger.info(f"[{state['cycle_id']}] Executor: Executed {len(executions)} trades")

            return state

        except Exception as e:
            logger.error(f"[{state['cycle_id']}] Executor node error: {e}")
            state["errors"].append(f"executor_error: {e}")
            return state

    async def run_cycle(self) -> AgentState:
        """Execute one complete cycle through the agent pipeline"""
        cycle_id = f"cycle_{self.metrics.cycles_completed}"
        state = self.create_initial_state(cycle_id)
        cycle_start = datetime.now(timezone.utc)

        try:
            logger.info(f"[{cycle_id}] ============ Starting cycle ============")

            # Run nodes in sequence
            state = await asyncio.wait_for(self.scout_node(state), timeout=10.0)
            state = await asyncio.wait_for(self.forecaster_node(state), timeout=10.0)
            state = await asyncio.wait_for(self.coordinator_node(state), timeout=10.0)
            state = await asyncio.wait_for(self.executor_node(state), timeout=10.0)

            cycle_duration = (datetime.now(timezone.utc) - cycle_start).total_seconds()
            duration_ms = int(cycle_duration * 1000)

            self.metrics.record_cycle(state, duration_ms)

            logger.info(
                f"[{cycle_id}] ✅ Cycle complete in {cycle_duration:.2f}s: "
                f"{len(state['opportunities'])} opps → "
                f"{len(state['scored_opportunities'])} scored → "
                f"{len(state['approvals'])} approved → "
                f"{len(state['executions'])} executed"
            )

            return state

        except asyncio.TimeoutError:
            logger.error(f"[{cycle_id}] Cycle timeout (>10s per node)")
            state["errors"].append("cycle_timeout")
            return state
        except Exception as e:
            logger.error(f"[{cycle_id}] Cycle failed: {e}")
            state["errors"].append(f"cycle_error: {e}")
            return state

    async def run(
        self,
        max_cycles: Optional[int] = None,
        cycle_interval_seconds: float = 5.0,
    ):
        """
        Main loop - execute agent swarm cycles indefinitely or until max_cycles

        Args:
            max_cycles: Maximum number of cycles to run (None = infinite)
            cycle_interval_seconds: Sleep between cycles
        """
        logger.info("🚀 Agent Swarm starting...")

        try:
            cycle = 0

            while max_cycles is None or cycle < max_cycles:
                state = await self.run_cycle()
                cycle += 1

                # Sleep before next cycle
                if cycle < (max_cycles or float('inf')):
                    logger.debug(f"Sleeping {cycle_interval_seconds}s before next cycle...")
                    await asyncio.sleep(cycle_interval_seconds)

            logger.info(f"✅ Agent Swarm completed {cycle} cycles")

        except KeyboardInterrupt:
            logger.info("⏹️  Agent Swarm interrupted by user")
        except Exception as e:
            logger.error(f"❌ Agent Swarm failed: {e}")
        finally:
            self.metrics.log_summary()


# Standalone test
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    async def main():
        swarm = AgentSwarm()

        # Test single cycle
        print("\n=== Testing Single Cycle ===")
        state = await swarm.run_cycle()
        print(f"State after cycle: opportunities={len(state['opportunities'])}, "
              f"scored={len(state['scored_opportunities'])}, "
              f"executed={len(state['executions'])}")

        assert len(state["opportunities"]) > 0
        assert len(state["scored_opportunities"]) > 0
        assert len(state["executions"]) > 0

        # Test multiple cycles
        print("\n=== Testing 3 Cycles ===")
        swarm2 = AgentSwarm()
        await swarm2.run(max_cycles=3, cycle_interval_seconds=0.5)

        assert swarm2.metrics.cycles_completed == 3
        assert swarm2.metrics.total_opportunities > 0

        print("\n✅ All tests passed!")

    asyncio.run(main())
