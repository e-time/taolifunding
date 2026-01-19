import type { GrvtFundingPoint, GrvtFundingResponse, GrvtInstrument, GrvtInstrumentResponse } from "../../types/grvt";

const GRVT_BASE_URL = "https://market-data.grvt.io/full/v1";
const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

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
          const value = fundingPoint.funding_rate_8_h_avg ?? fundingPoint.funding_rate ?? null;
          if (value !== null && Number.isFinite(Number(value))) {
            next[instrument.base.toUpperCase()] = Number(value / 100);
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
