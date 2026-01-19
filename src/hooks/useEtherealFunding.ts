import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEtherealFundingRates } from "../services/http/ethereal";
import type { EtherealFundingEntry } from "../types/ethereal";
import { LIGHTER_REFRESH_MS } from "../utils/constants";
import { loadConfigSync } from "../utils/config";

interface EtherealFundingState {
  rates: EtherealFundingEntry[];
  error: string | null;
  isRefreshing: boolean;
  lastUpdated: Date | null;
}

const initialState: EtherealFundingState = {
  rates: [],
  error: null,
  isRefreshing: false,
  lastUpdated: null,
};

export const useEtherealFunding = (): EtherealFundingState => {
  const [state, setState] = useState<EtherealFundingState>(initialState);
  const inFlightRef = useRef(false);
  const enabled = loadConfigSync().enabledExchanges.includes("ethereal");

  const pull = useCallback(async () => {
    if (inFlightRef.current || !enabled) return;
    inFlightRef.current = true;
    setState((prev) => ({ ...prev, isRefreshing: true }));

    try {
      const rates = await fetchEtherealFundingRates();
      
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
