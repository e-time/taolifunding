import type { AsterFundingEntry, AsterFundingInfoResponse, AsterPremiumIndexResponse } from "../../types/aster";

const ASTER_FUNDING_INFO_URL = "https://fapi.asterdex.com/fapi/v1/fundingInfo";
const ASTER_PREMIUM_INDEX_URL = "https://fapi.asterdex.com/fapi/v1/premiumIndex";
const ASTER_BOOK_TICKER_URL = "https://fapi.asterdex.com/fapi/v1/ticker/bookTicker";

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export async function fetchAsterFundingRates(): Promise<AsterFundingEntry[]> {
  const [fundingInfo, premiumIndex] = await Promise.all([
    fetch(ASTER_FUNDING_INFO_URL, { headers: JSON_HEADERS }).then((res) =>
      res.ok ? (res.json() as Promise<AsterFundingInfoResponse>) : []
    ),
    fetch(ASTER_PREMIUM_INDEX_URL, { headers: JSON_HEADERS }).then((res) =>
      res.ok ? (res.json() as Promise<AsterPremiumIndexResponse>) : []
    ),
  ]);

  // Map funding intervals (default 8h if missing)
  const intervalMap = new Map<string, number>();
  if (Array.isArray(fundingInfo)) {
    fundingInfo.forEach((info) => {
      if (info.symbol && typeof info.fundingIntervalHours === "number") {
        intervalMap.set(info.symbol, info.fundingIntervalHours);
      }
    });
  }

  // Process premium index
  if (!Array.isArray(premiumIndex)) return [];

  return premiumIndex
    .map((entry) => {
      const rawRate = parseFloat(entry.lastFundingRate);
      if (isNaN(rawRate)) return null;

      const symbol = entry.symbol.replace("USDT", ""); // Normalise symbol
      const interval = intervalMap.get(entry.symbol) || 8;
      
      // Standardize to 8 hours
      const rate = rawRate * (8 / interval);

      return { symbol, rate };
    })
    .filter((v): v is AsterFundingEntry => v !== null);
}

export interface AsterBookTicker {
  symbol: string;
  bidPrice: string;
  askPrice: string;
}

export async function fetchAsterBookTicker(): Promise<AsterBookTicker[]> {
  const response = await fetch(ASTER_BOOK_TICKER_URL, { headers: JSON_HEADERS });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}