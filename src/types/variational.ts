export interface VariationalListing {
  ticker: string; // e.g. "LUMIA", "AIOZ"
  name: string; // Full name, e.g. "Lumia", "AIOZ Network"
  mark_price: string;
  volume_24h: string;
  open_interest: {
    long_open_interest: string;
    short_open_interest: string;
  };
  funding_rate: string; // decimal string, e.g. "0.1095" (this appears to be in percentage already, 0.1095% = 0.001095)
  funding_interval_s: number; // seconds, e.g. 14400 (4h), 28800 (8h)
  base_spread_bps: string;
  quotes: {
    updated_at: string;
    size_1k: {
      bid: string;
      ask: string;
    };
    size_100k: {
      bid: string;
      ask: string;
    };
  };
}

export interface VariationalStatsResponse {
  total_volume_24h: string;
  cumulative_volume: string;
  tvl: string;
  open_interest: string;
  num_markets: number;
  loss_refund: {
    pool_size: string;
    refunded_24h: string;
  };
  listings: VariationalListing[];
}

export interface VariationalFundingEntry {
  symbol: string; // Ticker symbol
  rate: number; // decimal (e.g. 0.001095 for 0.1095%)
}
