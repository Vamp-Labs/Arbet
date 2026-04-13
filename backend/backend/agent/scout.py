"""Scout Agent - Market Price Polling & Opportunity Detection"""
import aiohttp
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential
import asyncio

logger = logging.getLogger(__name__)

class PricePoint(BaseModel):
    """Market price from a platform"""
    market_id: str
    platform: str  # "capitola", "polymarket", "hedgehog"
    bid_price: float
    ask_price: float
    timestamp: datetime

class Opportunity(BaseModel):
    """Detected arbitrage opportunity"""
    opportunity_id: str
    buy_market_id: str
    sell_market_id: str
    buy_price: float
    sell_price: float
    spread_bps: float
    estimated_profit_lamports: int
    timestamp: datetime

class Scout:
    """Scout agent for detecting market arbitrage opportunities"""

    def __init__(self, db_session=None):
        self.db_session = db_session
        self.last_prices = {}
        self.last_opportunity_time = {}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def fetch_capitola_prices(self) -> List[PricePoint]:
        """Fetch prices from Capitola API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.capitola.io/v1/markets/prices",
                    timeout=aiohttp.ClientTimeout(total=5),
                    headers={"Authorization": "Bearer YOUR_KEY"}
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        prices = [
                            PricePoint(
                                market_id=m["id"],
                                platform="capitola",
                                bid_price=m.get("bid", m.get("price", 0)),
                                ask_price=m.get("ask", m.get("price", 0)),
                                timestamp=datetime.utcnow()
                            )
                            for m in data.get("markets", [])
                        ]
                        logger.info(f"Fetched {len(prices)} prices from Capitola")
                        return prices
        except asyncio.TimeoutError:
            logger.warning("Capitola API timeout")
        except Exception as e:
            logger.error(f"Capitola error: {e}")
        return []

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def fetch_polymarket_prices(self) -> List[PricePoint]:
        """Fetch prices from Polymarket API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.polymarket.com/markets?limit=100",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        prices = [
                            PricePoint(
                                market_id=m["id"],
                                platform="polymarket",
                                bid_price=float(m.get("best_bid", m.get("price", 0))),
                                ask_price=float(m.get("best_ask", m.get("price", 0))),
                                timestamp=datetime.utcnow()
                            )
                            for m in data if isinstance(data, list)
                        ]
                        logger.info(f"Fetched {len(prices)} prices from Polymarket")
                        return prices
        except asyncio.TimeoutError:
            logger.warning("Polymarket API timeout")
        except Exception as e:
            logger.error(f"Polymarket error: {e}")
        return []

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def fetch_hedgehog_prices(self) -> List[PricePoint]:
        """Fetch prices from Hedgehog API (fallback)"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.hedgehog.trade/markets",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        prices = [
                            PricePoint(
                                market_id=m["id"],
                                platform="hedgehog",
                                bid_price=float(m.get("price", 0)),
                                ask_price=float(m.get("price", 0)),
                                timestamp=datetime.utcnow()
                            )
                            for m in data.get("markets", [])
                        ]
                        logger.info(f"Fetched {len(prices)} prices from Hedgehog")
                        return prices
        except asyncio.TimeoutError:
            logger.warning("Hedgehog API timeout")
        except Exception as e:
            logger.error(f"Hedgehog error: {e}")
        return []

    def detect_spreads(self, prices: List[PricePoint], min_spread_bps: int = 300) -> List[Opportunity]:
        """Detect arbitrage opportunities (spreads >300bps)"""
        opportunities = []
        spread_threshold = min_spread_bps / 10000

        # Group by market ID
        market_prices = {}
        for price in prices:
            if price.market_id not in market_prices:
                market_prices[price.market_id] = []
            market_prices[price.market_id].append(price)

        # Compare prices across platforms
        for market_id, all_prices in market_prices.items():
            for i, price1 in enumerate(all_prices):
                for price2 in all_prices[i+1:]:
                    if price1.platform != price2.platform:
                        # Check if buy on cheaper platform, sell on expensive
                        if price1.bid_price < price2.ask_price:
                            spread = (price2.ask_price - price1.bid_price) / price1.bid_price
                            spread_bps = int(spread * 10000)

                            if spread_bps >= min_spread_bps:
                                opp_id = f"{market_id}_{price1.platform}_{price2.platform}"

                                # Deduplication: skip if same pair seen in last 5 min
                                if opp_id in self.last_opportunity_time:
                                    if datetime.utcnow() - self.last_opportunity_time[opp_id] < timedelta(minutes=5):
                                        continue

                                opportunity = Opportunity(
                                    opportunity_id=opp_id,
                                    buy_market_id=f"{market_id}_{price1.platform}",
                                    sell_market_id=f"{market_id}_{price2.platform}",
                                    buy_price=price1.bid_price,
                                    sell_price=price2.ask_price,
                                    spread_bps=spread_bps,
                                    estimated_profit_lamports=int((spread / 100) * 1_000_000),  # Placeholder
                                    timestamp=datetime.utcnow()
                                )

                                opportunities.append(opportunity)
                                self.last_opportunity_time[opp_id] = datetime.utcnow()
                                logger.info(f"Opportunity detected: {spread_bps} bps spread")

        return opportunities

    async def run(self, interval_seconds: int = 30):
        """Main scout loop - fetch prices and detect opportunities"""
        while True:
            try:
                logger.info("Scout cycle starting...")

                # Fetch from all platforms concurrently
                capitola_prices, polymarket_prices, hedgehog_prices = await asyncio.gather(
                    self.fetch_capitola_prices(),
                    self.fetch_polymarket_prices(),
                    self.fetch_hedgehog_prices(),
                    return_exceptions=True
                )

                # Combine prices
                all_prices = []
                for prices in [capitola_prices, polymarket_prices, hedgehog_prices]:
                    if isinstance(prices, list):
                        all_prices.extend(prices)

                if not all_prices:
                    logger.warning("No prices fetched from any platform")
                else:
                    # Detect opportunities
                    opportunities = self.detect_spreads(all_prices)
                    logger.info(f"Scout cycle complete: {len(opportunities)} opportunities found")

                    # Store in DB if session available
                    if self.db_session and opportunities:
                        for opp in opportunities:
                            # TODO: Insert into DB
                            pass

                # Wait before next cycle
                await asyncio.sleep(interval_seconds)

            except Exception as e:
                logger.error(f"Scout error: {e}")
                await asyncio.sleep(interval_seconds)


# Standalone test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    scout = Scout()

    # Test price detection
    test_prices = [
        PricePoint(market_id="eth", platform="capitola", bid_price=100.0, ask_price=101.0, timestamp=datetime.utcnow()),
        PricePoint(market_id="eth", platform="polymarket", bid_price=104.0, ask_price=105.0, timestamp=datetime.utcnow()),
    ]

    opportunities = scout.detect_spreads(test_prices, min_spread_bps=300)
    print(f"Found {len(opportunities)} opportunities")
    for opp in opportunities:
        print(f"  {opp.opportunity_id}: {opp.spread_bps} bps")
