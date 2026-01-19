import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDydxFundingRates } from "../services/http/dydx";
import type { DydxFundingEntry } from "../types/dydx";
import { LIGHTER_REFRESH_MS } from "../utils/constants";
import { loadConfigSync } from "../utils/config";

interface DydxFundingState {
  rates: DydxFundingEntry[];
  error: string | null;
  isRefreshing: boolean;
  lastUpdated: Date | null;
}

const initialState: DydxFundingState = {
  rates: [],
  error: null,
  isRefreshing: false,
  lastUpdated: null,
};

export const useDydxFunding = (): DydxFundingState => {
  const [state, setState] = useState<DydxFundingState>(initialState);
  const inFlightRef = useRef(false);
  const enabled = loadConfigSync().enabledExchanges.includes("dydx");

  const pull = useCallback(async () => {
    if (inFlightRef.current || !enabled) return;
    inFlightRef.current = true;
    setState((prev) => ({ ...prev, isRefreshing: true }));

    try {
      const rates = await fetchDydxFundingRates();
      
      setState({ 
        rates, 
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
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

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
  }, [pull, enabled]);

  return state;
};
