"""Forecaster Agent - Correlated Event Detection & Opportunity Scoring"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, field_validator
import aiohttp
import numpy as np
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

class ScoredOpportunity(BaseModel):
    """Scored arbitrage opportunity with confidence and reasoning"""
    opportunity_id: str
    mispricing_type: str  # "incoherence" | "spread" | "divergence" | "temporal"
    confidence: float  # 0.0 to 1.0
    estimated_edge_bps: int
    buy_market_id: str
    sell_market_id: str
    reasoning: str

    @field_validator('confidence')
    @classmethod
    def validate_confidence(cls, v):
        if not (0.0 <= v <= 1.0):
            raise ValueError("confidence must be between 0 and 1")
        return v

    @field_validator('estimated_edge_bps')
    @classmethod
    def validate_edge_bps(cls, v):
        if v < 0:
            raise ValueError("estimated_edge_bps must be non-negative")
        return v


class Forecaster:
    """Forecaster agent for correlated event detection and opportunity scoring"""

    def __init__(self, db_session=None, ollama_host: str = "http://localhost:11434"):
        self.db_session = db_session
        self.ollama_host = ollama_host
        self.model = "qwen2:7b"  # Fallback model size
        self.historical_prices = {}
        self.price_history_window = timedelta(hours=24)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def _call_ollama(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Call Ollama LLM with retry logic"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_host}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "temperature": 0.0,
                        "stream": False,
                    },
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        response_text = data.get("response", "")
                        # Extract JSON from response
                        try:
                            json_start = response_text.find('{')
                            json_end = response_text.rfind('}') + 1
                            if json_start >= 0 and json_end > json_start:
                                json_str = response_text[json_start:json_end]
                                return json.loads(json_str)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse LLM JSON response: {response_text}")
                            return None
        except asyncio.TimeoutError:
            logger.warning("Ollama API timeout")
        except Exception as e:
            logger.error(f"Ollama error: {e}")
        return None

    def detect_incoherence(self, buy_price: float, sell_price: float) -> Optional[Dict[str, Any]]:
        """
        Detect market incoherence: if probabilities sum >100%, arbitrage exists
        Example: YES at 0.60 + NO at 0.50 = 1.10 (>100%)
        """
        try:
            # Treat prices as probabilities in [0,1]
            if not (0 <= buy_price <= 1 and 0 <= sell_price <= 1):
                return None

            total_prob = buy_price + sell_price

            if total_prob > 1.0:
                # Incoherence detected
                spread = total_prob - 1.0  # e.g., 0.10 for 10% incoherence
                confidence = min(0.99, 0.5 + (spread * 5))  # 0.5 + 5x spread, capped at 0.99
                edge_bps = int(spread * 10000)  # e.g., 1000 bps for 10% spread

                return {
                    "type": "incoherence",
                    "confidence": confidence,
                    "edge_bps": edge_bps,
                    "reasoning": f"Market incoherence: {buy_price:.2%} + {sell_price:.2%} = {total_prob:.2%} (>{1.0:.0%})"
                }
        except Exception as e:
            logger.error(f"Incoherence detection error: {e}")

        return None

    def detect_cross_platform_spread(self, platform_a_price: float, platform_b_price: float,
                                     platform_a_name: str, platform_b_name: str) -> Optional[Dict[str, Any]]:
        """
        Detect cross-platform spread: same market, different prices
        Example: Capitola $0.60 vs Polymarket $0.65 → 8.3% spread
        """
        try:
            if platform_a_price <= 0 or platform_b_price <= 0:
                return None

            # Buy cheaper, sell expensive
            if platform_a_price < platform_b_price:
                buy_price = platform_a_price
                sell_price = platform_b_price
            else:
                buy_price = platform_b_price
                sell_price = platform_a_price

            spread = (sell_price - buy_price) / buy_price

            if spread > 0.003:  # >30 bps threshold
                confidence = min(0.9, 0.6 + (spread * 0.2))  # Higher spread → higher confidence
                edge_bps = int(spread * 10000)

                return {
                    "type": "spread",
                    "confidence": confidence,
                    "edge_bps": edge_bps,
                    "reasoning": f"Cross-platform spread: buy at {buy_price:.4f}, sell at {sell_price:.4f} ({spread:.2%})"
                }
        except Exception as e:
            logger.error(f"Cross-platform spread detection error: {e}")

        return None

    def detect_pyth_divergence(self, market_price: float, pyth_feed_price: float) -> Optional[Dict[str, Any]]:
        """
        Detect Pyth oracle divergence: if market price diverges >5% from oracle
        Example: Market $0.50, Pyth $0.55 → 9% divergence → underpriced
        """
        try:
            if pyth_feed_price <= 0:
                return None

            divergence = abs(market_price - pyth_feed_price) / pyth_feed_price

            if divergence > 0.05:  # >5% threshold
                confidence = min(0.85, 0.6 + (divergence * 0.2))
                edge_bps = int(divergence * 10000)

                direction = "underpriced" if market_price < pyth_feed_price else "overpriced"

                return {
                    "type": "divergence",
                    "confidence": confidence,
                    "edge_bps": edge_bps,
                    "reasoning": f"Pyth divergence: market {market_price:.4f} vs oracle {pyth_feed_price:.4f} ({divergence:.2%}), {direction}"
                }
        except Exception as e:
            logger.error(f"Pyth divergence detection error: {e}")

        return None

    def detect_temporal_arbitrage(self, current_price: float, historical_prices: List[float]) -> Optional[Dict[str, Any]]:
        """
        Detect temporal arbitrage: current price is statistical outlier
        Example: Price 3 std devs from 24h mean → mispriced
        """
        try:
            if len(historical_prices) < 2:
                return None

            prices = np.array(historical_prices + [current_price])
            mean = np.mean(prices)
            std = np.std(prices)

            if std == 0:
                return None

            z_score = abs(current_price - mean) / std

            if z_score > 2.0:  # >2 std devs = significant outlier
                confidence = min(0.85, 0.5 + (min(z_score - 2, 2) * 0.15))  # 2-4 std devs
                edge_bps = int((abs(current_price - mean) / mean) * 10000)

                return {
                    "type": "temporal",
                    "confidence": confidence,
                    "edge_bps": edge_bps,
                    "reasoning": f"Temporal mispricing: current {current_price:.4f} is {z_score:.1f}σ from mean {mean:.4f}"
                }
        except Exception as e:
            logger.error(f"Temporal detection error: {e}")

        return None

    def _statistical_scoring(self, signals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fallback scoring when LLM is unavailable"""
        if not signals:
            return {
                "confidence": 0.3,
                "edge_bps": 100,
                "reasoning": "No signals detected"
            }

        # Majority vote: require >=2 signals
        if len(signals) < 2:
            base_confidence = 0.4 + (len(signals) * 0.2)  # 0.6 for 1 signal
        else:
            base_confidence = 0.7 + (min(len(signals) - 2, 2) * 0.1)  # 0.7-0.9

        avg_edge = int(np.mean([s.get("edge_bps", 0) for s in signals]))

        return {
            "confidence": base_confidence,
            "edge_bps": max(100, avg_edge),
            "reasoning": f"Statistical scoring: {len(signals)} signals detected"
        }

    async def score_opportunity(self, opportunity: Dict[str, Any],
                               historical_data: Optional[Dict[str, Any]] = None) -> Optional[ScoredOpportunity]:
        """
        Combine all signals and score opportunity using LLM or fallback
        """
        signals = []

        # Run all 4 detections
        if opportunity.get("buy_price") and opportunity.get("sell_price"):
            incoherence = self.detect_incoherence(
                opportunity["buy_price"],
                opportunity["sell_price"]
            )
            if incoherence:
                signals.append(incoherence)

        # Cross-platform spread (if available)
        if historical_data and "platform_prices" in historical_data:
            platform_prices = historical_data["platform_prices"]
            if len(platform_prices) >= 2:
                spread = self.detect_cross_platform_spread(
                    platform_prices[0]["price"],
                    platform_prices[1]["price"],
                    platform_prices[0]["platform"],
                    platform_prices[1]["platform"]
                )
                if spread:
                    signals.append(spread)

        # Pyth divergence (if available)
        if historical_data and "pyth_price" in historical_data:
            divergence = self.detect_pyth_divergence(
                opportunity.get("buy_price", 0),
                historical_data["pyth_price"]
            )
            if divergence:
                signals.append(divergence)

        # Temporal arbitrage (if available)
        if historical_data and "price_history" in historical_data:
            temporal = self.detect_temporal_arbitrage(
                opportunity.get("buy_price", 0),
                historical_data["price_history"]
            )
            if temporal:
                signals.append(temporal)

        # Require at least 2 signals for high confidence
        if len(signals) < 2:
            logger.info(f"Opportunity {opportunity.get('opportunity_id')} has only {len(signals)} signal(s), rejecting")
            return None

        # Try LLM scoring, fallback to statistical
        llm_result = None
        if historical_data:
            context = json.dumps(historical_data.get("similar_trades", [])[:5], default=str)
            prompt = f"""You are a prediction market analyst. Analyze this opportunity:
Market: {opportunity.get('buy_market_id')}
Price: {opportunity.get('buy_price')}
Signals: {len(signals)}
Historical context (top-5 similar trades):
{context}

Assess the probability of this outcome. Output ONLY valid JSON (no markdown, no explanation):
{{"confidence": 0.0-1.0, "edge_bps": int, "reasoning": "str"}}"""

            llm_result = await self._call_ollama(prompt)

        # Use LLM result or fallback
        if llm_result:
            try:
                score_dict = {
                    "confidence": llm_result.get("confidence", 0.5),
                    "edge_bps": llm_result.get("edge_bps", 100),
                    "reasoning": llm_result.get("reasoning", "LLM-based scoring")
                }
            except Exception as e:
                logger.warning(f"LLM result parsing error: {e}, using fallback")
                score_dict = self._statistical_scoring(signals)
        else:
            score_dict = self._statistical_scoring(signals)

        # Minimum confidence threshold
        if score_dict["confidence"] < 0.6:
            logger.info(f"Opportunity {opportunity.get('opportunity_id')} below confidence threshold ({score_dict['confidence']})")
            return None

        # Create ScoredOpportunity
        return ScoredOpportunity(
            opportunity_id=opportunity.get("opportunity_id", "unknown"),
            mispricing_type=signals[0].get("type", "unknown"),
            confidence=score_dict["confidence"],
            estimated_edge_bps=score_dict["edge_bps"],
            buy_market_id=opportunity.get("buy_market_id", ""),
            sell_market_id=opportunity.get("sell_market_id", ""),
            reasoning=score_dict["reasoning"]
        )

    async def run(self, interval_seconds: int = 30):
        """Main forecaster loop - consume opportunities and score them"""
        logger.info("Forecaster starting...")

        while True:
            try:
                logger.info("Forecaster cycle starting...")

                # TODO: In production, consume from message queue (opportunities from Scout)
                # For now, just wait for next cycle
                await asyncio.sleep(interval_seconds)

            except Exception as e:
                logger.error(f"Forecaster error: {e}")
                await asyncio.sleep(interval_seconds)


# Standalone test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    forecaster = Forecaster()

    # Test incoherence detection
    result = forecaster.detect_incoherence(0.6, 0.5)
    print(f"Incoherence test: {result}")
    assert result is not None
    assert result["confidence"] >= 0.9
    assert result["edge_bps"] >= 450

    # Test cross-platform spread
    result = forecaster.detect_cross_platform_spread(0.60, 0.65, "capitola", "polymarket")
    print(f"Spread test: {result}")
    assert result is not None
    assert 800 <= result["edge_bps"] <= 850

    # Test Pyth divergence
    result = forecaster.detect_pyth_divergence(0.50, 0.55)
    print(f"Divergence test: {result}")
    assert result is not None
    assert 800 <= result["edge_bps"] <= 1000

    # Test temporal arb
    historical = [0.50, 0.51, 0.49, 0.50, 0.51]
    result = forecaster.detect_temporal_arbitrage(0.60, historical)
    print(f"Temporal test: {result}")
    assert result is not None

    print("✅ All tests passed!")
