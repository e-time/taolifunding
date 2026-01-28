import type { GrvtInstrument, GrvtInstrumentResponse } from "../../types/grvt";

const GRVT_BASE_URL = "https://market-data.grvt.io/full/v1";
const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

interface GrvtTickerResponse {
  result?: {
    instrument: string;
    best_bid_price: string;
    best_ask_price: string;
    funding_rate: string; // Current/Predicted rate in %
    funding_rate_8h_curr?: string;
  };
}

export interface GrvtMarketData {
  rates: Record<string, number>;
  spreads: Record<string, number>;
  prices: Record<string, { bid: number; ask: number }>;
}

export async function fetchGrvtInstruments(): Promise<GrvtInstrument[]> {
  const response = await fetch(`${GRVT_BASE_URL}/instruments`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      kind: ["PERPETUAL"],
      quote: ["USDT"],
      is_active: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`GRVT instruments request failed: ${response.status}`);
  }

  const payload = (await response.json()) as GrvtInstrumentResponse;
  return payload.result ?? [];
}

export async function fetchGrvtMarketData(): Promise<GrvtMarketData> {
  const instruments = await fetchGrvtInstruments();
  const rates: Record<string, number> = {};
  const spreads: Record<string, number> = {};
  const prices: Record<string, { bid: number; ask: number }> = {};
  
  // Use a smaller delay if possible, but keep safe. 
  // Loop is sequential.
  const delayMs = 200; 

  for (let index = 0; index < instruments.length; index += 1) {
    const instrument = instruments[index];
    if (!instrument) continue;
    try {
      const response = await fetch(`${GRVT_BASE_URL}/ticker`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          instrument: instrument.instrument,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as GrvtTickerResponse;
        const result = payload.result;
        if (result) {
            const symbol = instrument.base.toUpperCase();

            // Funding Rate
            // GRVT returns rate in %. Example: "0.0032" means 0.0032%.
            // So decimal value = 0.0032 / 100.
            const rawRate = parseFloat(result.funding_rate);
            const interval = instrument.funding_interval_hours || 8;
            
            if (!isNaN(rawRate)) {
                const decimalRate = rawRate / 100;
                // Normalize to 8h
                rates[symbol] = decimalRate * (8 / interval);
            }

            // Prices & Spread
            const bid = parseFloat(result.best_bid_price);
            const ask = parseFloat(result.best_ask_price);
            
            if (bid > 0 && ask > 0) {
                prices[symbol] = { bid, ask };
                spreads[symbol] = (ask - bid) / ask;
            }
        }
      }
    } catch (e) {
      console.error(`GRVT ticker fetch failed for ${instrument.instrument}:`, e);
    }

    if (index < instruments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { rates, spreads, prices };
}

// Deprecated or wrappers if needed, but we will update server.ts
export async function fetchGrvtFundingRates(): Promise<Record<string, number>> {
    const data = await fetchGrvtMarketData();
    return data.rates;
}

export async function fetchGrvtBookTicker(): Promise<Record<string, { bid: number, ask: number }>> {
    const data = await fetchGrvtMarketData();
    return data.prices;
}