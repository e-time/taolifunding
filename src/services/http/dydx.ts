import type { DydxFundingEntry, DydxMarketsResponse } from "../../types/dydx";

const DYDX_API_URL = "https://indexer.dydx.trade/v4";

export async function fetchDydxFundingRates(): Promise<DydxFundingEntry[]> {
  const response = await fetch(`${DYDX_API_URL}/perpetualMarkets`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`dYdX markets request failed: ${response.status}`);
  }

  const payload = (await response.json()) as DydxMarketsResponse;
  
  return Object.values(payload.markets)
    .filter(m => m.status === "ACTIVE")
    .map(m => {
      const rawRate = parseFloat(m.nextFundingRate);
      return {
        // ticker is like "BTC-USD", we want "BTC"
        symbol: m.ticker.split("-")[0].toUpperCase(),
        rate: isNaN(rawRate) ? 0 : rawRate * 8, // Convert 1h to 8h
      };
    });
}
