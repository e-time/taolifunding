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

interface EtherealMarketPriceDto {
  productId: string;
  bestBidPrice: string;
  bestAskPrice: string;
}

interface EtherealMarketPriceResponse {
  data: EtherealMarketPriceDto[];
}

export async function fetchEtherealBookTicker(): Promise<Record<string, { bid: number, ask: number }>> {
  const response = await fetch(`${ETHEREAL_API_URL}/product`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Ethereal products request failed: ${response.status}`);
  }

  const productsPayload = (await response.json()) as EtherealProductResponse;
  const activeProducts = productsPayload.data.filter(p => p.status === "ACTIVE");
  
  if (activeProducts.length === 0) return {};

  const productMap = new Map<string, string>(); // id -> symbol
  const productIds: string[] = [];

  activeProducts.forEach(p => {
    productMap.set(p.id, p.baseTokenName.toUpperCase());
    productIds.push(p.id);
  });

  const prices: Record<string, { bid: number, ask: number }> = {};
  
  // Chunking by 50 as per spec maxItems
  const chunkSize = 50;
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize);
    const url = new URL(`${ETHEREAL_API_URL}/product/market-price`);
    chunk.forEach(id => url.searchParams.append("productIds", id));
    
    try {
      const priceResponse = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!priceResponse.ok) {
        console.error(`Ethereal market-price request failed: ${priceResponse.status}`);
        continue;
      }

      const payload = (await priceResponse.json()) as EtherealMarketPriceResponse;
      if (payload && Array.isArray(payload.data)) {
        payload.data.forEach(item => {
          const symbol = productMap.get(item.productId);
          if (symbol) {
            const bid = parseFloat(item.bestBidPrice);
            const ask = parseFloat(item.bestAskPrice);
            if (bid > 0 && ask > 0) {
              prices[symbol] = { bid, ask };
            }
          }
        });
      }
    } catch (e) {
      console.error("Ethereal book fetch failed", e);
    }
  }

  return prices;
}
