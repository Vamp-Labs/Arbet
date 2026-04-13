"""Data models for API and agents"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class VaultBase(BaseModel):
    vault_address: str
    authority: str
    position_limit_bps: int = 500
    max_drawdown_bps: int = 1000

class VaultCreate(VaultBase):
    pass

class VaultState(VaultBase):
    balance: int
    initial_balance: int
    cumulative_pnl: int
    num_trades: int
    is_paused: bool

    class Config:
        from_attributes = True

class Opportunity(BaseModel):
    opportunity_id: str
    buy_market_id: str
    sell_market_id: str
    buy_price: float
    sell_price: float
    spread_bps: int
    platform: str
    timestamp: datetime

class ScoredOpportunity(BaseModel):
    opportunity_id: str
    mispricing_type: str  # "incoherence", "spread", "divergence", "temporal"
    confidence: float  # 0.0 to 1.0
    estimated_edge_bps: int
    buy_market_id: str
    sell_market_id: str
    reasoning: str

class ExecutorAction(BaseModel):
    opportunity_id: str
    bundle_id: str
    tx_signature: str
    status: str  # "submitted", "confirmed", "failed"
    timestamp: datetime

class CoordinatorApproval(BaseModel):
    trade_id: str
    approved: bool
    reason: str
    risk_score: float

class AgentLogEntry(BaseModel):
    timestamp: datetime
    agent: str  # "scout", "forecaster", "coordinator", "executor"
    action: str
    details: Dict[str, Any]

class TradeHistory(BaseModel):
    trade_id: int
    timestamp: datetime
    buy_market: str
    sell_market: str
    edge_bps: int
    pnl_lamports: int
    tx_signature: str
    status: str
