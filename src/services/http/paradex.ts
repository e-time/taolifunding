import type { ParadexFundingEntry, ParadexMarketDefinition, ParadexMarketsResponse, ParadexMarketSummaryResponse } from "../../types/paradex";

const PARADEX_API_URL = "https://api.prod.paradex.trade/v1";

let cachedFundingPeriods: Record<string, number> | null = null;

async function fetchFundingPeriods(): Promise<Record<string, number>> {
  if (cachedFundingPeriods) return cachedFundingPeriods;

  const response = await fetch(`${PARADEX_API_URL}/markets`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Paradex markets request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ParadexMarketsResponse;
  const periods: Record<string, number> = {};
  
  for (const market of payload.results) {
    // Full Symbol -> Period
    periods[market.symbol] = market.funding_period_hours;
  }

  cachedFundingPeriods = periods;
  return periods;
}

export async function fetchParadexFundingRates(): Promise<ParadexFundingEntry[]> {
  // 1. Ensure we have funding periods
  const periods = await fetchFundingPeriods();

  // 2. Fetch current summaries
  const response = await fetch(`${PARADEX_API_URL}/markets/summary?market=ALL`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Paradex summary request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ParadexMarketSummaryResponse;
  
  const entries: ParadexFundingEntry[] = [];

  for (const summary of payload.results) {
    const rawRate = parseFloat(summary.funding_rate);
    if (isNaN(rawRate)) continue;

    const baseSymbol = summary.symbol.split("-")[0];

    entries.push({
      symbol: baseSymbol,
      rate: rawRate,
    });
  }

  return entries;
}

export interface ParadexBookTicker {
  symbol: string;
  bidPrice: string;
  askPrice: string;
}

export async function fetchParadexBookTicker(): Promise<ParadexBookTicker[]> {
  const response = await fetch(`${PARADEX_API_URL}/markets/summary?market=ALL`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as ParadexMarketSummaryResponse;
  
  return payload.results.map(summary => ({
    symbol: summary.symbol.split("-")[0],
    bidPrice: summary.bid,
    askPrice: summary.ask,
  }));
}