"""FastAPI REST API Server with WebSocket Support"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import FastAPI, WebSocket, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.api.service import (
    APIService,
    HealthCheckResponse,
    OpportunityRecord,
    TradeRecord,
    AgentLogEntry,
    VaultState,
)

logger = logging.getLogger(__name__)

# Global service instance
service: Optional[APIService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup/shutdown"""
    global service
    logger.info("🚀 Starting API server...")
    service = APIService()
    yield
    logger.info("🛑 Shutting down API server...")


app = FastAPI(
    title="Arbet Agent API",
    description="REST API for Arbet prediction market arbitrage agents",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# REST Endpoints
@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Server health and agent metrics"""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return service.get_health()


@app.get("/opportunities", response_model=List[OpportunityRecord])
async def get_opportunities(
    limit: int = Query(50, ge=1, le=1000),
    min_spread_bps: int = Query(0, ge=0),
):
    """Get recent opportunities sorted by spread (highest first)"""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return service.get_opportunities(limit=limit, min_spread_bps=min_spread_bps)


@app.get("/trades", response_model=List[TradeRecord])
async def get_trades(
    vault_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    hours_back: int = Query(24, ge=1, le=720),
):
    """Get trade history with optional vault filtering"""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    return service.get_trades(
        vault_id=vault_id,
        limit=limit,
        hours_back=hours_back,
    )


@app.get("/vault/{vault_id}", response_model=VaultState)
async def get_vault(vault_id: str):
    """Get vault state (balance, PnL, drawdown)"""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    vault = service.get_vault_state(vault_id)
    if vault is None:
        raise HTTPException(status_code=404, detail=f"Vault {vault_id} not found")

    return vault


@app.post("/vault/{vault_id}/create")
async def create_vault(
    vault_id: str,
    authority: str,
    initial_balance: int = 0,
):
    """Create new vault"""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    vault = service.create_vault(vault_id, authority, initial_balance)
    return {"vault_id": vault.vault_id, "authority": vault.authority}


@app.get("/agent-logs", response_model=List[AgentLogEntry])
async def get_agent_logs(
    agent: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=5000),
    hours_back: int = Query(24, ge=1, le=720),
):
    """Get agent decision logs with optional filtering"""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    return service.get_agent_logs(
        agent=agent,
        limit=limit,
        hours_back=hours_back,
    )


# WebSocket Endpoint
@app.websocket("/ws/agent-state")
async def websocket_agent_state(websocket: WebSocket):
    """WebSocket for real-time agent events"""
    if service is None:
        await websocket.close(code=status.WS_1011_SERVER_ERROR)
        return

    await websocket.accept()
    logger.info(f"WebSocket client connected")

    try:
        # Send initial health check
        health = service.get_health()
        await websocket.send_json({
            "type": "server_ready",
            "data": health.dict(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # Simulate event streaming (in production, connect to agent event queue)
        event_count = 0
        while True:
            # Simulate receiving events every second
            await asyncio.sleep(1)

            # Send heartbeat every 30 seconds
            if event_count % 30 == 0:
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            # Simulate random events for testing
            event_count += 1

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        logger.info("WebSocket client disconnected")


# Test helpers
@app.post("/test/opportunity")
async def test_add_opportunity(
    opportunity_id: str,
    buy_market_id: str,
    sell_market_id: str,
    buy_price: float,
    sell_price: float,
    spread_bps: int,
):
    """Test endpoint to add opportunity"""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    opp = service.add_opportunity(
        opportunity_id=opportunity_id,
        buy_market_id=buy_market_id,
        sell_market_id=sell_market_id,
        buy_price=buy_price,
        sell_price=sell_price,
        spread_bps=spread_bps,
    )
    return opp.dict()


@app.post("/test/trade")
async def test_add_trade(
    trade_id: str,
    vault_id: str,
    buy_amount: int,
    sell_amount: int,
    actual_edge_bps: int,
    pnl_lamports: int,
):
    """Test endpoint to add trade"""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    trade = service.add_trade(
        trade_id=trade_id,
        vault_id=vault_id,
        buy_amount=buy_amount,
        sell_amount=sell_amount,
        actual_edge_bps=actual_edge_bps,
        pnl_lamports=pnl_lamports,
    )
    return trade.dict()


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting FastAPI server...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
