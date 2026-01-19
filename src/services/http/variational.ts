import type { VariationalListing, VariationalStatsResponse, VariationalFundingEntry } from "../../types/variational";

const VARIATIONAL_STATS_URL = "https://omni-client-api.prod.ap-northeast-1.variational.io/metadata/stats";
const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export async function fetchVariationalStats(): Promise<VariationalStatsResponse> {
  const response = await fetch(VARIATIONAL_STATS_URL, { headers: JSON_HEADERS });
  if (!response.ok) {
    throw new Error(`Variational stats request failed: ${response.status}`);
  }
  return response.json() as Promise<VariationalStatsResponse>;
}

export async function fetchVariationalFundingRates(): Promise<VariationalFundingEntry[]> {
  const stats = await fetchVariationalStats();

  return stats.listings
    .map((listing: VariationalListing) => {
      // funding_rate is the Annualized Rate (APR) as a decimal
      // To get the standardized 8-hour rate: APR / (365 * 3)
      const rawRate = listing.funding_rate;
      const annualizedRate = Number(rawRate);
      if (!Number.isFinite(annualizedRate)) return null;

      const symbol = listing.ticker.toUpperCase();
      const eightHourRate = annualizedRate / 1095;

      return { symbol, rate: eightHourRate } as VariationalFundingEntry;
    })
    .filter((v): v is VariationalFundingEntry => v !== null);
}

export interface VariationalBookTicker {
  symbol: string;
  bidPrice: string;
  askPrice: string;
}

export async function fetchVariationalBookTicker(): Promise<VariationalBookTicker[]> {
  const stats = await fetchVariationalStats();
  
  return stats.listings.map(listing => {
    // Access nested quotes.size_1k.bid / ask
    const quotes = listing.quotes as any; 
    const bid = quotes?.size_1k?.bid || quotes?.best_bid || "0";
    const ask = quotes?.size_1k?.ask || quotes?.best_ask || "0";
    
    return {
      symbol: listing.ticker.toUpperCase(),
      bidPrice: bid,
      askPrice: ask,
    };
  });
}