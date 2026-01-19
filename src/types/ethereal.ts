export interface EtherealProduct {
  id: string;
  ticker: string;
  displayTicker: string;
  baseTokenName: string;
  fundingRate1h: string;
  status: string;
}

export interface EtherealProductResponse {
  data: EtherealProduct[];
  hasNext: boolean;
}

export interface EtherealFundingEntry {
  symbol: string;
  rate: number; // 8h normalized
}
