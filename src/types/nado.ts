export interface NadoMarket {
  product_id: number;
  symbol: string;
  funding_rate: string; // decimal string
}

export interface NadoMarketsResponse {
  perp_products: NadoMarket[];
}

export interface NadoFundingEntry {
  symbol: string;
  rate: number; // 8h normalized
}
