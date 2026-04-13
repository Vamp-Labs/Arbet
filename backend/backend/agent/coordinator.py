"""Coordinator Agent - Risk Governance & Circuit Breaker"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, field_validator
from collections import defaultdict

logger = logging.getLogger(__name__)


class CoordinatorApproval(BaseModel):
    """Risk approval decision for a trade"""
    trade_id: str
    approved: bool
    reason: str  # "approved", "position_limit_exceeded", "drawdown_exceeded", "correlation_risk", etc.
    risk_score: float  # 0-100
    timestamp: datetime

    @field_validator('risk_score')
    @classmethod
    def validate_risk_score(cls, v):
        if not (0 <= v <= 100):
            raise ValueError("risk_score must be between 0 and 100")
        return v


class VaultState(BaseModel):
    """Current vault state for risk calculations"""
    vault_id: str
    current_balance: int  # lamports
    initial_balance: int  # lamports
    max_balance: int  # lamports
    min_balance: int  # lamports
    num_trades: int


class Coordinator:
    """Coordinator agent for risk governance and circuit breaker enforcement"""

    def __init__(
        self,
        db_session=None,
        position_limit_bps: int = 500,  # 5% of TVL
        max_drawdown_bps: int = 1000,   # 10% max drawdown
    ):
        self.db_session = db_session
        self.position_limit_bps = position_limit_bps
        self.max_drawdown_bps = max_drawdown_bps
        self.margin_reserve_pct = 0.05  # Reserve 5% as margin
        self.correlation_threshold = 0.5  # Warn if >50% positions in one category
        self.positions = defaultdict(int)  # market_category -> count

    def check_position_limit(
        self,
        trade_amount: int,
        vault_tvl: int,
    ) -> Tuple[bool, str, float]:
        """
        Check if trade amount respects position limit

        Args:
            trade_amount: Amount to trade in lamports
            vault_tvl: Total vault value in lamports

        Returns:
            Tuple of (approved: bool, reason: str, risk_score: float)
        """
        try:
            # Calculate position limit
            position_limit = int((vault_tvl * self.position_limit_bps) / 10000)

            if trade_amount > position_limit:
                reason = f"position_limit_exceeded ({trade_amount} > {position_limit})"
                logger.warning(f"Position limit check FAILED: {reason}")
                return False, reason, 100.0

            # Calculate risk score based on position as % of limit
            position_pct = trade_amount / position_limit if position_limit > 0 else 0
            risk_score = 0.0

            if position_pct >= 0.75:
                risk_score = 50.0
            elif position_pct >= 0.50:
                risk_score = 30.0
            elif position_pct >= 0.25:
                risk_score = 20.0

            logger.info(
                f"Position limit check PASSED: {trade_amount} <= {position_limit} "
                f"({position_pct*100:.1f}% of limit), risk_score={risk_score}"
            )

            return True, "position_limit_ok", risk_score

        except Exception as e:
            logger.error(f"Position limit check error: {e}")
            return False, f"position_check_error: {e}", 50.0

    def check_drawdown(
        self,
        current_balance: int,
        initial_balance: int,
    ) -> Tuple[bool, str, float]:
        """
        Check if drawdown is within acceptable limits

        Args:
            current_balance: Current vault balance in lamports
            initial_balance: Initial vault balance in lamports

        Returns:
            Tuple of (approved: bool, reason: str, risk_score: float)
        """
        try:
            if initial_balance <= 0:
                logger.warning("Invalid initial balance for drawdown check")
                return False, "invalid_initial_balance", 100.0

            # Calculate drawdown percentage
            drawdown = 1.0 - (current_balance / initial_balance)
            max_drawdown = self.max_drawdown_bps / 10000

            if drawdown > max_drawdown:
                reason = f"drawdown_exceeded (drawdown={drawdown*100:.2f}% > max={max_drawdown*100:.2f}%)"
                logger.warning(f"Drawdown check FAILED: {reason}")
                return False, reason, 100.0

            # Calculate risk score based on drawdown as % of max
            drawdown_pct = drawdown / max_drawdown if max_drawdown > 0 else 0
            risk_score = 0.0

            if drawdown_pct >= 0.75:
                risk_score = 50.0
            elif drawdown_pct >= 0.50:
                risk_score = 25.0

            logger.info(
                f"Drawdown check PASSED: {drawdown*100:.2f}% <= {max_drawdown*100:.2f}%, "
                f"risk_score={risk_score}"
            )

            return True, "drawdown_ok", risk_score

        except Exception as e:
            logger.error(f"Drawdown check error: {e}")
            return False, f"drawdown_check_error: {e}", 50.0

    def check_margin(
        self,
        trade_amount: int,
        vault_balance: int,
    ) -> Tuple[bool, str, float]:
        """
        Check if margin reserve is maintained

        Args:
            trade_amount: Amount to trade in lamports
            vault_balance: Current vault balance in lamports

        Returns:
            Tuple of (approved: bool, reason: str, risk_score: float)
        """
        try:
            # Calculate minimum reserve needed
            min_reserve = int(vault_balance * self.margin_reserve_pct)
            available = vault_balance - trade_amount

            if available < min_reserve:
                reason = f"margin_insufficient (available {available} < reserve {min_reserve})"
                logger.warning(f"Margin check FAILED: {reason}")
                return False, reason, 60.0

            logger.info(f"Margin check PASSED: {available} available > {min_reserve} reserve")

            return True, "margin_ok", 0.0

        except Exception as e:
            logger.error(f"Margin check error: {e}")
            return False, f"margin_check_error: {e}", 30.0

    def check_correlation_risk(
        self,
        market_categories: List[str],
    ) -> Tuple[bool, str, float]:
        """
        Check for correlation risk (too many positions in same category)

        Args:
            market_categories: List of market categories for positions in portfolio

        Returns:
            Tuple of (approved: bool, reason: str, risk_score: float)
        """
        try:
            if not market_categories:
                return True, "no_positions", 0.0

            # Count positions by category
            category_counts = defaultdict(int)
            for cat in market_categories:
                category_counts[cat] += 1

            total_positions = len(market_categories)
            max_category_pct = max(category_counts.values()) / total_positions if total_positions > 0 else 0

            # Warn if concentration is high but still allow trade
            if max_category_pct > self.correlation_threshold:
                reason = f"correlation_risk_detected ({max_category_pct*100:.1f}% in top category)"
                logger.warning(f"Correlation risk: {reason}")
                return True, reason, 15.0  # Still approved but flagged

            logger.info(f"Correlation check PASSED: max concentration {max_category_pct*100:.1f}%")

            return True, "correlation_ok", 0.0

        except Exception as e:
            logger.error(f"Correlation check error: {e}")
            return True, f"correlation_check_warning: {e}", 5.0

    async def approve_trade(
        self,
        trade_id: str,
        trade_amount: int,
        vault_state: VaultState,
        market_categories: Optional[List[str]] = None,
    ) -> CoordinatorApproval:
        """
        Perform all risk checks and issue approval or rejection

        Args:
            trade_id: Unique trade identifier
            trade_amount: Amount to trade in lamports
            vault_state: Current vault state
            market_categories: Optional list of market categories for correlation check

        Returns:
            CoordinatorApproval with decision and risk score
        """
        try:
            vault_tvl = vault_state.current_balance

            # Run all checks
            pos_ok, pos_reason, pos_risk = self.check_position_limit(trade_amount, vault_tvl)
            draw_ok, draw_reason, draw_risk = self.check_drawdown(
                vault_state.current_balance,
                vault_state.initial_balance
            )
            margin_ok, margin_reason, margin_risk = self.check_margin(
                trade_amount,
                vault_state.current_balance
            )

            corr_ok, corr_reason, corr_risk = self.check_correlation_risk(
                market_categories or []
            )

            # Combine decisions: all must pass for approval
            all_checks_pass = pos_ok and draw_ok and margin_ok
            combined_risk = pos_risk + draw_risk + margin_risk + corr_risk

            if all_checks_pass:
                approval = CoordinatorApproval(
                    trade_id=trade_id,
                    approved=True,
                    reason=f"approved (pos_ok={pos_ok}, draw_ok={draw_ok}, margin_ok={margin_ok}, corr={corr_reason})",
                    risk_score=min(100, combined_risk),
                    timestamp=datetime.now(timezone.utc),
                )
                logger.info(f"Trade {trade_id} APPROVED: risk_score={combined_risk}")
            else:
                # Determine primary reason for rejection
                if not pos_ok:
                    primary_reason = pos_reason
                elif not draw_ok:
                    primary_reason = draw_reason
                else:
                    primary_reason = margin_reason

                approval = CoordinatorApproval(
                    trade_id=trade_id,
                    approved=False,
                    reason=primary_reason,
                    risk_score=100.0,
                    timestamp=datetime.now(timezone.utc),
                )
                logger.warning(f"Trade {trade_id} REJECTED: {primary_reason}")

            return approval

        except Exception as e:
            logger.error(f"Approval error: {e}")
            return CoordinatorApproval(
                trade_id=trade_id,
                approved=False,
                reason=f"approval_error: {e}",
                risk_score=100.0,
                timestamp=datetime.now(timezone.utc),
            )

    async def run(self, interval_seconds: int = 10):
        """Main coordinator loop - consume trades and approve/reject"""
        logger.info("Coordinator starting...")

        while True:
            try:
                logger.info("Coordinator cycle starting...")

                # TODO: In production, consume from message queue (trades from Executor)
                # For now, just wait for next cycle
                await asyncio.sleep(interval_seconds)

            except Exception as e:
                logger.error(f"Coordinator error: {e}")
                await asyncio.sleep(interval_seconds)


# Standalone test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    coordinator = Coordinator(position_limit_bps=500, max_drawdown_bps=1000)

    # Test position limit check
    print("\n=== Position Limit Tests ===")
    ok, reason, risk = coordinator.check_position_limit(500_000, 10_000_000)
    print(f"Trade 0.5M, limit 0.5M (5% TVL): ok={ok}, risk={risk}")
    assert ok is True

    ok, reason, risk = coordinator.check_position_limit(1_200_000, 10_000_000)
    print(f"Trade 1.2M, limit 0.5M (5% TVL): ok={ok}, risk={risk}")
    assert ok is False

    # Test drawdown check
    print("\n=== Drawdown Tests ===")
    ok, reason, risk = coordinator.check_drawdown(9_000_000, 10_000_000)
    print(f"Balance 90% of initial (10% drawdown, max 10%): ok={ok}, risk={risk}")
    assert ok is True

    ok, reason, risk = coordinator.check_drawdown(8_900_000, 10_000_000)
    print(f"Balance 89% of initial (11% drawdown, max 10%): ok={ok}, risk={risk}")
    assert ok is False

    # Test margin check
    print("\n=== Margin Tests ===")
    ok, reason, risk = coordinator.check_margin(1_000_000, 10_000_000)
    print(f"Trade 1M, balance 10M (reserve 0.5M): ok={ok}, risk={risk}")
    assert ok is True

    ok, reason, risk = coordinator.check_margin(10_000_000, 10_000_000)
    print(f"Trade 10M, balance 10M (no reserve): ok={ok}, risk={risk}")
    assert ok is False

    # Test correlation risk
    print("\n=== Correlation Risk Tests ===")
    ok, reason, risk = coordinator.check_correlation_risk(
        ["election", "crypto", "sports", "election", "crypto"]
    )
    print(f"Portfolio: 2 elections, 2 crypto, 1 sports (40% max): ok={ok}, risk={risk}")
    assert ok is True

    ok, reason, risk = coordinator.check_correlation_risk(
        ["election", "election", "election", "election", "election"]
    )
    print(f"Portfolio: all election (100% concentration): ok={ok}, risk={risk}")
    assert ok is True  # Still approved but flagged

    # Test full approval flow
    print("\n=== Full Approval Tests ===")
    vault_state = VaultState(
        vault_id="vault_001",
        current_balance=10_000_000,
        initial_balance=10_000_000,
        max_balance=10_500_000,
        min_balance=9_500_000,
        num_trades=5,
    )

    approval = asyncio.run(coordinator.approve_trade(
        trade_id="trade_001",
        trade_amount=400_000,
        vault_state=vault_state,
        market_categories=["election", "crypto"],
    ))
    print(f"Trade 001: approved={approval.approved}, risk={approval.risk_score}, reason={approval.reason}")
    assert approval.approved is True

    # Test rejection
    vault_state_low = VaultState(
        vault_id="vault_001",
        current_balance=8_500_000,  # 15% drawdown
        initial_balance=10_000_000,
        max_balance=10_000_000,
        min_balance=8_500_000,
        num_trades=50,
    )

    approval = asyncio.run(coordinator.approve_trade(
        trade_id="trade_002",
        trade_amount=500_000,
        vault_state=vault_state_low,
    ))
    print(f"Trade 002 (high drawdown): approved={approval.approved}, reason={approval.reason}")
    assert approval.approved is False

    print("\n✅ All tests passed!")
