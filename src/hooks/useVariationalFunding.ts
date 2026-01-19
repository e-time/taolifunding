import { useCallback, useEffect, useRef, useState } from "react";
import { fetchVariationalFundingRates } from "../services/http/variational";
import type { VariationalFundingEntry } from "../types/variational";
import { VARIATIONAL_REFRESH_MS } from "../utils/constants";

interface VariationalFundingState {
  rates: VariationalFundingEntry[];
  error: string | null;
  isRefreshing: boolean;
  lastUpdated: Date | null;
}

const initialState: VariationalFundingState = {
  rates: [],
  error: null,
  isRefreshing: false,
  lastUpdated: null,
};

export const useVariationalFunding = (): VariationalFundingState => {
  const [state, setState] = useState<VariationalFundingState>(initialState);
  const inFlightRef = useRef(false);

  const pull = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState((prev) => ({ ...prev, isRefreshing: true }));

    try {
      const result = await fetchVariationalFundingRates();
      setState({ rates: result, error: null, isRefreshing: false, lastUpdated: new Date() });
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
    const interval = setInterval(tick, VARIATIONAL_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pull]);

  return state;
};
