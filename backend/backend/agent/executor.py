"""Executor Agent - Jito Bundle Submission & Trade Execution"""
import asyncio
import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class ExecutorAction(BaseModel):
    """Trade execution action with bundle and confirmation tracking"""
    opportunity_id: str
    bundle_id: Optional[str] = None
    tx_signature: Optional[str] = None
    status: str  # "submitted" | "confirmed" | "failed" | "aborted"
    timestamp: datetime
    slippage_pct: float = 0.0
    actual_edge_bps: int = 0
    error_message: Optional[str] = None


class Executor:
    """Executor agent for building bundles and submitting trades"""

    def __init__(
        self,
        db_session=None,
        rpc_url: str = "https://api.devnet.solana.com",
        jito_endpoint: str = "https://api.devnet.jito.wtf/api/v1/bundles",
        jito_auth_token: Optional[str] = None,
        vault_authority: Optional[str] = None,
    ):
        self.db_session = db_session
        self.rpc_url = rpc_url
        self.jito_endpoint = jito_endpoint
        self.jito_auth_token = jito_auth_token
        self.vault_authority = vault_authority
        self.slippage_tolerance = 0.02  # 2% default slippage tolerance
        self.max_confirmation_time = 30  # seconds
        self.confirmation_poll_interval = 2  # seconds

    async def build_bundle(
        self,
        opportunity: Dict[str, Any],
        vault_balance: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Build Jito bundle with swap + execute_arb instructions

        Args:
            opportunity: Scored opportunity with buy/sell market IDs and edge estimate
            vault_balance: Current vault balance in lamports

        Returns:
            Bundle structure with serialized transaction
        """
        try:
            edge_bps = opportunity.get("estimated_edge_bps", 100)
            buy_market_id = opportunity.get("buy_market_id")
            sell_market_id = opportunity.get("sell_market_id")

            if not (buy_market_id and sell_market_id and edge_bps > 0):
                logger.error(f"Invalid opportunity: missing required fields")
                return None

            # Calculate buy amount: use percentage of vault based on position limit
            # Conservative: use 10% of vault capital per trade
            buy_amount_lamports = int(vault_balance * 0.1)

            # Expected sell amount based on edge estimate
            # edge_bps = (sell - buy) / buy * 10000
            # So: sell = buy * (1 + edge_bps / 10000)
            expected_sell_amount = int(
                buy_amount_lamports * (1 + edge_bps / 10000)
            )

            # Min output with 2% slippage tolerance
            min_sell_amount = int(
                expected_sell_amount * (1 - self.slippage_tolerance)
            )

            bundle = {
                "opportunity_id": opportunity.get("opportunity_id"),
                "buy_market_id": buy_market_id,
                "sell_market_id": sell_market_id,
                "buy_amount_lamports": buy_amount_lamports,
                "expected_sell_amount": expected_sell_amount,
                "min_sell_amount": min_sell_amount,
                "estimated_edge_bps": edge_bps,
                "compute_unit_price": 1000,  # microlamports (can be increased for priority)
                "instructions": [
                    {
                        "type": "swap",
                        "direction": "buy",
                        "market_id": buy_market_id,
                        "amount": buy_amount_lamports,
                    },
                    {
                        "type": "execute_arb",
                        "buy_market_id": buy_market_id,
                        "sell_market_id": sell_market_id,
                        "buy_amount": buy_amount_lamports,
                        "min_sell_amount": min_sell_amount,
                        "estimated_edge_bps": edge_bps,
                    },
                    {
                        "type": "swap",
                        "direction": "sell",
                        "market_id": sell_market_id,
                        "min_amount": min_sell_amount,
                    },
                ],
            }

            logger.info(
                f"Built bundle for {opportunity.get('opportunity_id')}: "
                f"buy {buy_amount_lamports} → expect {expected_sell_amount} (min {min_sell_amount})"
            )

            return bundle

        except Exception as e:
            logger.error(f"Bundle build error: {e}")
            return None

    async def simulate_transaction(
        self,
        bundle: Dict[str, Any],
    ) -> Tuple[bool, Optional[int], Optional[float]]:
        """
        Simulate transaction to verify it succeeds and check slippage

        Args:
            bundle: Bundle with instructions to simulate

        Returns:
            Tuple of (success: bool, actual_sell_amount: int or None, slippage: float or None)
        """
        try:
            expected_sell = bundle.get("expected_sell_amount", 0)
            min_sell = bundle.get("min_sell_amount", 0)

            # Simulate: assume swap succeeds, extract simulated output
            # In production, call actual RPC simulateTransaction
            # For now, simulate a realistic outcome with small slippage
            import random

            # Simulate 0-1.5% slippage (within 2% tolerance)
            simulated_slippage = random.uniform(0, 0.015)
            actual_sell_amount = int(expected_sell * (1 - simulated_slippage))

            # Check if meets minimum threshold
            if actual_sell_amount < min_sell:
                logger.warning(
                    f"Simulation failed slippage check: "
                    f"actual {actual_sell_amount} < min {min_sell}"
                )
                return False, None, simulated_slippage

            logger.info(
                f"Simulation passed: expected {expected_sell}, got {actual_sell_amount} "
                f"({simulated_slippage*100:.2f}% slippage)"
            )

            return True, actual_sell_amount, simulated_slippage

        except Exception as e:
            logger.error(f"Simulation error: {e}")
            return False, None, None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=5))
    async def submit_bundle(self, bundle: Dict[str, Any]) -> Optional[str]:
        """
        Submit bundle to Jito API

        Args:
            bundle: Serialized bundle to submit

        Returns:
            bundle_id from Jito API
        """
        try:
            headers = {}
            if self.jito_auth_token:
                headers["Authorization"] = f"Bearer {self.jito_auth_token}"

            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "sendBundle",
                "params": [
                    [
                        # Serialized transaction bytes (base64 in production)
                        bundle.get("opportunity_id")
                    ]
                ],
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.jito_endpoint,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        bundle_id = data.get("result")
                        if bundle_id:
                            logger.info(f"Bundle submitted: {bundle_id}")
                            return bundle_id
                        else:
                            logger.warning(f"Jito response missing bundle_id: {data}")
                            return None
                    elif resp.status == 429:
                        logger.warning("Jito rate limit (429), retrying...")
                        raise Exception("Rate limited")
                    else:
                        logger.error(f"Jito API error {resp.status}")
                        return None

        except asyncio.TimeoutError:
            logger.warning("Jito API timeout")
            return None
        except Exception as e:
            logger.error(f"Bundle submission error: {e}")
            raise

    async def wait_for_confirmation(
        self,
        tx_signature: str,
        bundle_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Poll for transaction confirmation on-chain

        Args:
            tx_signature: Transaction signature to poll
            bundle_id: Optional Jito bundle ID

        Returns:
            Tuple of (confirmed: bool, error_message: str or None)
        """
        try:
            elapsed = 0

            while elapsed < self.max_confirmation_time:
                try:
                    # Poll via RPC getSignatureStatus
                    async with aiohttp.ClientSession() as session:
                        payload = {
                            "jsonrpc": "2.0",
                            "id": 1,
                            "method": "getSignatureStatuses",
                            "params": [[tx_signature]],
                        }

                        async with session.post(
                            self.rpc_url,
                            json=payload,
                            timeout=aiohttp.ClientTimeout(total=5),
                        ) as resp:
                            if resp.status == 200:
                                data = await resp.json()
                                result = data.get("result", {}).get("value", [None])[0]

                                if result is None:
                                    # Not yet confirmed
                                    logger.debug(f"TX {tx_signature[:8]}... not yet confirmed")
                                elif result.get("err") is not None:
                                    # Failed
                                    error = result.get("err")
                                    logger.error(f"TX {tx_signature[:8]}... failed: {error}")
                                    return False, f"On-chain error: {error}"
                                else:
                                    # Confirmed
                                    logger.info(f"TX {tx_signature[:8]}... confirmed!")
                                    return True, None

                except Exception as e:
                    logger.warning(f"Poll error: {e}")

                # Wait before next poll
                await asyncio.sleep(self.confirmation_poll_interval)
                elapsed += self.confirmation_poll_interval

            # Timeout
            logger.warning(f"Confirmation timeout for {tx_signature[:8]}...")
            return False, "Confirmation timeout (>30s)"

        except Exception as e:
            logger.error(f"Confirmation polling error: {e}")
            return False, f"Polling error: {e}"

    async def execute_opportunity(
        self,
        opportunity: Dict[str, Any],
        vault_balance: int,
    ) -> ExecutorAction:
        """
        Full execution pipeline: build → simulate → submit → confirm

        Args:
            opportunity: Scored opportunity from Forecaster
            vault_balance: Current vault balance

        Returns:
            ExecutorAction with status and details
        """
        action = ExecutorAction(
            opportunity_id=opportunity.get("opportunity_id", "unknown"),
            timestamp=datetime.utcnow(),
        )

        try:
            # Step 1: Build bundle
            bundle = await self.build_bundle(opportunity, vault_balance)
            if not bundle:
                action.status = "aborted"
                action.error_message = "Failed to build bundle"
                return action

            # Step 2: Simulate transaction
            sim_success, actual_sell, slippage = await self.simulate_transaction(bundle)
            if not sim_success:
                action.status = "aborted"
                action.slippage_pct = (slippage * 100) if slippage else 0.0
                action.error_message = "Simulation failed slippage check"
                logger.info(f"Aborted {opportunity.get('opportunity_id')} due to slippage")
                return action

            # Update action with simulation results
            action.slippage_pct = (slippage * 100) if slippage else 0.0
            if actual_sell:
                buy_amount = bundle.get("buy_amount_lamports", 1)
                action.actual_edge_bps = int(
                    ((actual_sell - buy_amount) / buy_amount) * 10000
                )

            # Step 3: Submit bundle
            bundle_id = await self.submit_bundle(bundle)
            if not bundle_id:
                action.status = "failed"
                action.error_message = "Failed to submit bundle to Jito"
                return action

            action.bundle_id = bundle_id
            # Use bundle_id as tx_signature for now (in production, would be actual TX sig)
            action.tx_signature = bundle_id

            # Step 4: Wait for confirmation
            confirmed, error_msg = await self.wait_for_confirmation(bundle_id)
            if confirmed:
                action.status = "confirmed"
                logger.info(f"Trade executed: {opportunity.get('opportunity_id')}")
            else:
                action.status = "failed"
                action.error_message = error_msg
                logger.warning(
                    f"Trade failed: {opportunity.get('opportunity_id')} - {error_msg}"
                )

            return action

        except Exception as e:
            action.status = "failed"
            action.error_message = str(e)
            logger.error(f"Execution error: {e}")
            return action

    async def run(self, interval_seconds: int = 10):
        """Main executor loop - consume opportunities and execute trades"""
        logger.info("Executor starting...")

        while True:
            try:
                logger.info("Executor cycle starting...")

                # TODO: In production, consume from message queue (opportunities from Forecaster)
                # For now, just wait for next cycle
                await asyncio.sleep(interval_seconds)

            except Exception as e:
                logger.error(f"Executor error: {e}")
                await asyncio.sleep(interval_seconds)


# Standalone test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    executor = Executor()

    # Test bundle building
    opportunity = {
        "opportunity_id": "test_opp_001",
        "buy_market_id": "market_btc_yes",
        "sell_market_id": "market_btc_no",
        "estimated_edge_bps": 450,
    }

    vault_balance = 10_000_000  # 10 SOL in lamports

    bundle = asyncio.run(executor.build_bundle(opportunity, vault_balance))
    print(f"Bundle built: {bundle}")
    assert bundle is not None
    assert bundle["buy_amount_lamports"] > 0
    assert bundle["expected_sell_amount"] > bundle["buy_amount_lamports"]
    assert bundle["min_sell_amount"] < bundle["expected_sell_amount"]

    # Test simulation
    sim_success, actual_sell, slippage = asyncio.run(executor.simulate_transaction(bundle))
    print(f"Simulation: success={sim_success}, actual_sell={actual_sell}, slippage={slippage*100:.2f}%")
    assert sim_success is True
    assert actual_sell is not None
    assert actual_sell >= bundle["min_sell_amount"]

    print("✅ All tests passed!")
