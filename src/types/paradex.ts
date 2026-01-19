export interface ParadexMarketDefinition {
  symbol: string;
  funding_period_hours: number;
}

export interface ParadexMarketSummary {
  symbol: string;
  funding_rate: string; // string decimal
}

export interface ParadexMarketSummaryResponse {
  results: ParadexMarketSummary[];
}

export interface ParadexMarketsResponse {
  results: ParadexMarketDefinition[];
}

export interface ParadexFundingEntry {
  symbol: string;
  rate: number; // 8h normalized
}
