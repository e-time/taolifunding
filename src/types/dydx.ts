export interface DydxMarket {
  ticker: string;
  nextFundingRate: string; // decimal string
  status: string;
}

export interface DydxMarketsResponse {
  markets: Record<string, DydxMarket>;
}

export interface DydxFundingEntry {
  symbol: string;
  rate: number; // 8h normalized
}
