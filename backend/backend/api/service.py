"""REST API Server with WebSocket Support for Agent Dashboard"""
import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from enum import Enum

logger = logging.getLogger(__name__)


# Data Models
class VaultState(BaseModel):
    """Current state of a vault"""
    vault_id: str
    authority: str
    balance: int  # lamports
    initial_balance: int
    cumulative_pnl: int
    num_trades: int
    max_balance: int
    min_balance: int
    position_limit_bps: int
    max_drawdown_bps: int
    is_paused: bool

    @property
    def drawdown_pct(self) -> float:
        """Calculate current drawdown percentage"""
        if self.initial_balance <= 0:
            return 0.0
        return 1.0 - (self.balance / self.initial_balance)

    @property
    def pnl_pct(self) -> float:
        """Calculate PnL percentage"""
        if self.initial_balance <= 0:
            return 0.0
        return (self.balance - self.initial_balance) / self.initial_balance


class OpportunityRecord(BaseModel):
    """Detected arbitrage opportunity"""
    opportunity_id: str
    buy_market_id: str
    sell_market_id: str
    buy_price: float
    sell_price: float
    spread_bps: int
    timestamp: datetime


class TradeRecord(BaseModel):
    """Executed trade record"""
    trade_id: str
    vault_id: str
    buy_amount: int
    sell_amount: int
    actual_edge_bps: int
    pnl_lamports: int
    timestamp: datetime
    status: str  # "confirmed" | "failed"


class AgentLogEntry(BaseModel):
    """Agent decision/action log"""
    timestamp: datetime
    agent: str  # "scout" | "forecaster" | "coordinator" | "executor"
    action: str
    details: Dict[str, Any]


class HealthCheckResponse(BaseModel):
    """Server health and agent metrics"""
    status: str  # "healthy" | "degraded"
    uptime_seconds: float
    agent_cycles_completed: int
    opportunities_per_minute: float
    trades_per_minute: float
    total_pnl_lamports: int
    timestamp: datetime


class WebSocketMessage(BaseModel):
    """WebSocket event message"""
    type: str  # "opportunity_found", "trade_scored", "trade_approved", "trade_executed"
    data: Dict[str, Any]
    timestamp: datetime


# API Service Layer
class APIService:
    """Service layer for API operations"""

    def __init__(self):
        self.vaults = {}  # vault_id -> VaultState
        self.opportunities = []  # List[OpportunityRecord]
        self.trades = []  # List[TradeRecord]
        self.agent_logs = []  # List[AgentLogEntry]
        self.start_time = datetime.now(timezone.utc)

    def get_health(self) -> HealthCheckResponse:
        """Get server health and metrics"""
        uptime = (datetime.now(timezone.utc) - self.start_time).total_seconds()

        # Calculate per-minute rates
        if uptime > 0:
            opps_per_min = len(self.opportunities) / (uptime / 60)
            trades_per_min = len(self.trades) / (uptime / 60)
        else:
            opps_per_min = 0.0
            trades_per_min = 0.0

        # Calculate total PnL
        total_pnl = sum(trade.pnl_lamports for trade in self.trades)

        return HealthCheckResponse(
            status="healthy",
            uptime_seconds=uptime,
            agent_cycles_completed=0,  # Updated by agent
            opportunities_per_minute=opps_per_min,
            trades_per_minute=trades_per_min,
            total_pnl_lamports=total_pnl,
            timestamp=datetime.now(timezone.utc),
        )

    def get_opportunities(self, limit: int = 50, min_spread_bps: int = 0) -> List[OpportunityRecord]:
        """Get recent opportunities, sorted by spread descending"""
        filtered = [opp for opp in self.opportunities if opp.spread_bps >= min_spread_bps]
        sorted_opps = sorted(filtered, key=lambda x: x.spread_bps, reverse=True)
        return sorted_opps[:limit]

    def get_trades(
        self,
        vault_id: Optional[str] = None,
        limit: int = 100,
        hours_back: int = 24,
    ) -> List[TradeRecord]:
        """Get trade history with optional filtering"""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)

        filtered = [
            trade for trade in self.trades
            if (vault_id is None or trade.vault_id == vault_id)
            and trade.timestamp >= cutoff
        ]

        sorted_trades = sorted(filtered, key=lambda x: x.timestamp, reverse=True)
        return sorted_trades[:limit]

    def get_vault_state(self, vault_id: str) -> Optional[VaultState]:
        """Get vault state"""
        return self.vaults.get(vault_id)

    def create_vault(self, vault_id: str, authority: str, initial_balance: int = 0) -> VaultState:
        """Create new vault"""
        vault = VaultState(
            vault_id=vault_id,
            authority=authority,
            balance=initial_balance,
            initial_balance=initial_balance,
            cumulative_pnl=0,
            num_trades=0,
            max_balance=initial_balance,
            min_balance=initial_balance,
            position_limit_bps=500,  # 5%
            max_drawdown_bps=1000,  # 10%
            is_paused=False,
        )
        self.vaults[vault_id] = vault
        return vault

    def add_opportunity(
        self,
        opportunity_id: str,
        buy_market_id: str,
        sell_market_id: str,
        buy_price: float,
        sell_price: float,
        spread_bps: int,
    ) -> OpportunityRecord:
        """Record detected opportunity"""
        opp = OpportunityRecord(
            opportunity_id=opportunity_id,
            buy_market_id=buy_market_id,
            sell_market_id=sell_market_id,
            buy_price=buy_price,
            sell_price=sell_price,
            spread_bps=spread_bps,
            timestamp=datetime.now(timezone.utc),
        )
        self.opportunities.append(opp)
        logger.info(f"Opportunity recorded: {opportunity_id} ({spread_bps}bps)")
        return opp

    def add_trade(
        self,
        trade_id: str,
        vault_id: str,
        buy_amount: int,
        sell_amount: int,
        actual_edge_bps: int,
        pnl_lamports: int,
        status: str = "confirmed",
    ) -> TradeRecord:
        """Record executed trade"""
        trade = TradeRecord(
            trade_id=trade_id,
            vault_id=vault_id,
            buy_amount=buy_amount,
            sell_amount=sell_amount,
            actual_edge_bps=actual_edge_bps,
            pnl_lamports=pnl_lamports,
            timestamp=datetime.now(timezone.utc),
            status=status,
        )
        self.trades.append(trade)

        # Update vault state
        if vault_id in self.vaults:
            vault = self.vaults[vault_id]
            vault.balance += pnl_lamports
            vault.cumulative_pnl += pnl_lamports
            vault.num_trades += 1
            if vault.balance > vault.max_balance:
                vault.max_balance = vault.balance
            if vault.balance < vault.min_balance or vault.min_balance == 0:
                vault.min_balance = vault.balance

        logger.info(f"Trade recorded: {trade_id} (pnl={pnl_lamports}, balance={vault.balance if vault_id in self.vaults else 'N/A'})")
        return trade

    def add_agent_log(
        self,
        agent: str,
        action: str,
        details: Dict[str, Any],
    ) -> AgentLogEntry:
        """Record agent log entry"""
        log = AgentLogEntry(
            timestamp=datetime.now(timezone.utc),
            agent=agent,
            action=action,
            details=details,
        )
        self.agent_logs.append(log)
        logger.debug(f"Agent log: {agent}/{action}")
        return log

    def get_agent_logs(
        self,
        agent: Optional[str] = None,
        limit: int = 500,
        hours_back: int = 24,
    ) -> List[AgentLogEntry]:
        """Get agent logs with optional filtering"""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)

        filtered = [
            log for log in self.agent_logs
            if (agent is None or log.agent == agent)
            and log.timestamp >= cutoff
        ]

        sorted_logs = sorted(filtered, key=lambda x: x.timestamp, reverse=True)
        return sorted_logs[:limit]


# Standalone test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    print("\n=== Testing API Service ===")
    service = APIService()

    # Test vault creation
    vault = service.create_vault("vault_001", "authority_pubkey", 10_000_000)
    print(f"Created vault: {vault.vault_id}, balance={vault.balance}")
    assert vault.balance == 10_000_000

    # Test opportunity recording
    opp = service.add_opportunity(
        "opp_001",
        "market_btc_yes",
        "market_btc_no",
        0.60,
        0.65,
        833,
    )
    print(f"Recorded opportunity: {opp.opportunity_id}, spread={opp.spread_bps}bps")
    assert opp.spread_bps == 833

    # Test trade recording
    trade = service.add_trade(
        "trade_001",
        "vault_001",
        1_000_000,
        1_042_500,
        425,
        42_500,
    )
    print(f"Recorded trade: {trade.trade_id}, pnl={trade.pnl_lamports}")
    assert trade.pnl_lamports == 42_500

    # Test vault update
    vault_updated = service.get_vault_state("vault_001")
    print(f"Updated vault: balance={vault_updated.balance}, cumulative_pnl={vault_updated.cumulative_pnl}")
    assert vault_updated.balance == 10_042_500
    assert vault_updated.cumulative_pnl == 42_500

    # Test health check
    health = service.get_health()
    print(f"Health: status={health.status}, uptime={health.uptime_seconds:.1f}s, total_pnl={health.total_pnl_lamports}")
    assert health.status == "healthy"
    assert health.total_pnl_lamports == 42_500

    # Test opportunity filtering
    opps = service.get_opportunities(limit=10, min_spread_bps=800)
    print(f"Opportunities (min 800bps): {len(opps)} found")
    assert len(opps) == 1

    # Test trade filtering
    trades = service.get_trades(vault_id="vault_001", limit=100)
    print(f"Trades for vault_001: {len(trades)} found")
    assert len(trades) == 1

    # Test agent logging
    log = service.add_agent_log(
        "scout",
        "opportunity_found",
        {"opportunity_id": "opp_001", "spread_bps": 833},
    )
    print(f"Agent log: {log.agent}/{log.action}")
    assert log.agent == "scout"

    # Test log filtering
    logs = service.get_agent_logs(agent="scout", limit=10)
    print(f"Scout logs: {len(logs)} found")
    assert len(logs) == 1

    print("\n✅ All tests passed!")
