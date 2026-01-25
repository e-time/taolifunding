export interface NadoFundingEntry {
  symbol: string;
  rate: number;
}

const GATEWAY_URL = "https://gateway.prod.nado.xyz/v1/query";
const ARCHIVE_URL = "https://archive.prod.nado.xyz/v1";

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "Accept-Encoding": "gzip, deflate, br",
};

interface NadoSymbol {
  product_id: number;
  symbol: string;
  type: string;
}

interface NadoFundingRateResponse {
  [productId: string]: {
    product_id: number;
    funding_rate_x18: string;
    update_time: string;
  };
}

interface NadoMarketPriceResponse {
  status: string;
  data: {
    market_prices: Array<{
      product_id: number;
      bid_x18: string;
      ask_x18: string;
    }>;
  };
}

export async function fetchNadoFundingRates(): Promise<NadoFundingEntry[]> {
  // 1. Fetch Symbols
  const symbolsRes = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ type: "symbols" }),
  });

  if (!symbolsRes.ok) {
    throw new Error(`Nado symbols request failed: ${symbolsRes.status}`);
  }

  const symbolsData = await symbolsRes.json();
  const perps = Object.values(symbolsData.data.symbols).filter(
    (s: any) => s.type === "perp"
  ) as NadoSymbol[];

  if (perps.length === 0) return [];

  const productIds = perps.map((p) => p.product_id);
  const symbolMap = new Map(perps.map((p) => [p.product_id, p.symbol.replace("-PERP", "")]));

  // 2. Fetch Funding Rates
  const fundingRes = await fetch(ARCHIVE_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ funding_rates: { product_ids: productIds } }),
  });

  if (!fundingRes.ok) {
    throw new Error(`Nado funding request failed: ${fundingRes.status}`);
  }

  const fundingData = (await fundingRes.json()) as NadoFundingRateResponse;
  
  return Object.values(fundingData).map((item) => {
    const symbol = symbolMap.get(item.product_id) || `NADO-${item.product_id}`;
    const rateX18 = BigInt(item.funding_rate_x18);
    // The raw rate appears to be a Daily (24h) rate based on comparison (approx 24x discrepancy when treated as 1h * 8).
    // To get 8h rate from Daily: rate / 3.
    const rateDaily = Number(rateX18) / 1e18;
    return {
      symbol,
      rate: rateDaily / 3,
    };
  });
}

export async function fetchNadoBookTicker(): Promise<Record<string, { bid: number; ask: number }>> {
  // 1. Fetch Symbols to get product IDs
  const symbolsRes = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ type: "symbols" }),
  });

  if (!symbolsRes.ok) return {};

  const symbolsData = await symbolsRes.json();
  const perps = Object.values(symbolsData.data.symbols).filter(
    (s: any) => s.type === "perp"
  ) as NadoSymbol[];

  if (perps.length === 0) return {};

  const productIds = perps.map((p) => p.product_id);
  const symbolMap = new Map(perps.map((p) => [p.product_id, p.symbol.replace("-PERP", "")]));

  // 2. Fetch Market Prices
  const priceRes = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ type: "market_prices", product_ids: productIds }),
  });

  if (!priceRes.ok) return {};

  const priceData = (await priceRes.json()) as NadoMarketPriceResponse;
  const prices: Record<string, { bid: number; ask: number }> = {};

  if (priceData.status === "success" && priceData.data.market_prices) {
    priceData.data.market_prices.forEach((item) => {
      const symbol = symbolMap.get(item.product_id);
      if (symbol) {
        prices[symbol] = {
          bid: Number(item.bid_x18) / 1e18,
          ask: Number(item.ask_x18) / 1e18,
        };
      }
    });
  }

  return prices;
}
