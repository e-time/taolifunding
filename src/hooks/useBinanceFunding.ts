import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBinancePremiumIndex, fetchBinanceFundingInfo, fetchBinanceBookTicker } from "../services/http/binance";
import { LIGHTER_REFRESH_MS } from "../utils/constants";

interface BinanceFundingEntry {
  symbol: string;
  rate: number;
  intervalHours: number;
}

interface BinanceFundingState {
  rates: BinanceFundingEntry[];
  spreads: Record<string, number>;
  error: string | null;
  isRefreshing: boolean;
  lastUpdated: Date | null;
}

const initialState: BinanceFundingState = {
  rates: [],
  spreads: {},
  error: null,
  isRefreshing: false,
  lastUpdated: null,
};

export const useBinanceFunding = (): BinanceFundingState => {
  const [state, setState] = useState<BinanceFundingState>(initialState);
  const inFlightRef = useRef(false);

  const pull = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState((prev) => ({ ...prev, isRefreshing: true }));

    try {
      const [premiumIndexData, fundingInfoData, bookTickerData] = await Promise.all([
        fetchBinancePremiumIndex(),
        fetchBinanceFundingInfo(),
        fetchBinanceBookTicker(),
      ]);

      // Create funding interval map
      const intervalMap = fundingInfoData;

      // Process premium index data - only include entries where nextFundingTime > 0
      const filteredRates = premiumIndexData
        .filter((entry) => entry.nextFundingTime > 0 && entry.lastFundingRate !== "0.00000000")
        .map((entry) => {
          const fundingRate = parseFloat(entry.lastFundingRate);
          const intervalHours = intervalMap.get(entry.symbol.toUpperCase()) ?? 8;
          
          // Normalize rate to 8-hour equivalent
          const normalizedRate = fundingRate * (8 / intervalHours);
          
          return {
            symbol: entry.symbol,
            rate: normalizedRate,
            intervalHours,
          } as BinanceFundingEntry;
        });

      const spreads: Record<string, number> = {};
      bookTickerData.forEach((t) => {
        const bid = parseFloat(t.bidPrice);
        const ask = parseFloat(t.askPrice);
        if (bid > 0 && ask > 0) {
          spreads[t.symbol.toUpperCase()] = (ask - bid) / ask;
        }
      });
      
      setState({ 
        rates: filteredRates, 
        spreads,
        error: null, 
        isRefreshing: false, 
        lastUpdated: new Date() 
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: (error as Error).message,
        isRefreshing: false,
      }));
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await pull();
    };

    void tick();
    const interval = setInterval(tick, LIGHTER_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pull]);

  return state;
};
