import type { GrvtFundingPoint, GrvtFundingResponse, GrvtInstrument, GrvtInstrumentResponse } from "../../types/grvt";

const GRVT_BASE_URL = "https://market-data.grvt.io/full/v1";
const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

interface GrvtBookResponse {
  result?: {
    instrument: string;
    bids: Array<{ price: string; size: string }>;
    asks: Array<{ price: string; size: string }>;
  };
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

export async function fetchGrvtFundingPoint(instrument: string): Promise<GrvtFundingPoint | null> {
  const response = await fetch(`${GRVT_BASE_URL}/funding`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      instrument,
      limit: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`GRVT funding request failed for ${instrument}: ${response.status}`);
  }

  const payload = (await response.json()) as GrvtFundingResponse;
  return payload.result?.[0] ?? null;
}

export async function fetchGrvtFundingRates(): Promise<Record<string, number>> {
  const instruments = await fetchGrvtInstruments();
  const next: Record<string, number> = {};
  const delayMs = 500; // Constant FETCH_GAP_MS equivalent

  for (let index = 0; index < instruments.length; index += 1) {
    const instrument = instruments[index];
    if (!instrument) continue;
    try {
      const response = await fetch(`${GRVT_BASE_URL}/funding`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          instrument: instrument.instrument,
          limit: 1,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as GrvtFundingResponse;
        const fundingPoint = payload.result?.[0] ?? null;
        if (fundingPoint) {
          // Prefer raw funding_rate and normalize based on interval
          const rawRate = Number(fundingPoint.funding_rate);
          const interval = fundingPoint.funding_interval_hours || 8;
          
          if (Number.isFinite(rawRate)) {
            // Rate is in percentage (e.g. 0.01 means 0.01%).
            // Convert to decimal: 0.01 / 100.
            // Then normalize to 8h.
            const decimalRate = rawRate / 100;
            const normalizedRate = decimalRate * (8 / interval);
            
            next[instrument.base.toUpperCase()] = normalizedRate;
          }
        }
      }
    } catch (e) {
      console.error(`GRVT fetch failed for ${instrument.instrument}:`, e);
    }

    if (index < instruments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return next;
}

export async function fetchGrvtBookTicker(): Promise<Record<string, { bid: number, ask: number }>> {
  const instruments = await fetchGrvtInstruments();
  const prices: Record<string, { bid: number, ask: number }> = {};
  const delayMs = 200; 

  for (let index = 0; index < instruments.length; index += 1) {
    const instrument = instruments[index];
    if (!instrument) continue;
    try {
      const response = await fetch(`${GRVT_BASE_URL}/book`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          instrument: instrument.instrument,
          depth: 10,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as GrvtBookResponse;
        const result = payload.result;
        if (result && result.bids.length > 0 && result.asks.length > 0) {
            const bestBid = parseFloat(result.bids[0].price);
            const bestAsk = parseFloat(result.asks[0].price);
            if (bestBid > 0 && bestAsk > 0) {
                prices[instrument.base.toUpperCase()] = { bid: bestBid, ask: bestAsk };
            }
        }
      }
    } catch (e) {
      console.error(`GRVT book fetch failed for ${instrument.instrument}:`, e);
    }

    if (index < instruments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return prices;
}
