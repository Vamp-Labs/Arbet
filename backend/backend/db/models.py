"""Database models and schema for Arbet Agents"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, BigInteger, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    """User account"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    wallet_address = Column(String(255), unique=True, nullable=False)
    username = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Vault(Base):
    """Trading vault per user"""
    __tablename__ = "vaults"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    vault_address = Column(String(255), unique=True, nullable=False)  # PDA address on-chain
    authority = Column(String(255), nullable=False)  # Wallet authority
    balance = Column(BigInteger, default=0)  # Lamports
    initial_balance = Column(BigInteger, default=0)
    cumulative_pnl = Column(BigInteger, default=0)
    max_balance = Column(BigInteger, default=0)
    min_balance = Column(BigInteger, default=0)
    position_limit_bps = Column(Integer, default=500)  # 5% default
    max_drawdown_bps = Column(Integer, default=1000)  # 10% default
    is_paused = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Opportunity(Base):
    """Market arbitrage opportunity detected by Scout"""
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True)
    opportunity_id = Column(String(255), unique=True, nullable=False)
    buy_market_id = Column(String(255), nullable=False)
    sell_market_id = Column(String(255), nullable=False)
    buy_price = Column(Float, nullable=False)
    sell_price = Column(Float, nullable=False)
    spread_bps = Column(Integer, nullable=False)  # Basis points
    platform = Column(String(255), nullable=False)  # "capitola", "polymarket", "hedgehog"
    created_at = Column(DateTime, default=datetime.utcnow)

class Trade(Base):
    """Executed trade with on-chain record"""
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True)
    vault_id = Column(Integer, nullable=False)
    trade_id = Column(Integer, nullable=False)  # Sequential trade number
    opportunity_id = Column(String(255))
    buy_market_id = Column(String(255), nullable=False)
    sell_market_id = Column(String(255), nullable=False)
    buy_amount = Column(BigInteger, nullable=False)  # Lamports
    sell_amount = Column(BigInteger, nullable=False)  # Lamports
    actual_edge_bps = Column(Integer, nullable=False)
    pnl_lamports = Column(BigInteger, nullable=False)  # Profit/loss
    tx_signature = Column(String(255), unique=True)  # Solana TX signature
    status = Column(String(50), default="pending")  # pending, confirmed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime)

class AgentLog(Base):
    """Agent decision logs for audit trail"""
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True)
    vault_id = Column(Integer, nullable=False)
    agent = Column(String(50), nullable=False)  # "scout", "forecaster", "coordinator", "executor"
    action = Column(String(255), nullable=False)  # "opportunity_found", "trade_scored", etc.
    details = Column(JSON)  # Full context as JSON
    created_at = Column(DateTime, default=datetime.utcnow)

class RiskCheck(Base):
    """Risk evaluation for trades"""
    __tablename__ = "risk_checks"

    id = Column(Integer, primary_key=True)
    trade_id = Column(Integer, nullable=False)
    position_limit_check = Column(Boolean, default=True)
    drawdown_check = Column(Boolean, default=True)
    correlation_risk = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    approved = Column(Boolean, default=False)
    reason = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
