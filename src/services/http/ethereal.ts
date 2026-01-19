import type { EtherealFundingEntry, EtherealProductResponse } from "../../types/ethereal";

const ETHEREAL_API_URL = "https://api.ethereal.trade/v1";

export async function fetchEtherealFundingRates(): Promise<EtherealFundingEntry[]> {
  const response = await fetch(`${ETHEREAL_API_URL}/product`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Ethereal products request failed: ${response.status}`);
  }

  const payload = (await response.json()) as EtherealProductResponse;
  
  return payload.data
    .filter(p => p.status === "ACTIVE")
    .map(p => {
      const rawRate = parseFloat(p.fundingRate1h);
      return {
        symbol: p.baseTokenName.toUpperCase(),
        rate: isNaN(rawRate) ? 0 : rawRate * 8, // Convert 1h to 8h
      };
    });
}
