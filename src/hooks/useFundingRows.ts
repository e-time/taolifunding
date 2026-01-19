import { useEffect, useState } from "react";
import type { EdgexFundingEntry } from "../types/edgex";
import type { LighterFundingEntry } from "../types/lighter";
import type { TableRow } from "../types/table";
import type { BackpackFundingEntry } from "../types/backpack";
import type { AsterFundingEntry } from "../types/aster";
import type { VariationalFundingEntry } from "../types/variational";
import type { ParadexFundingEntry } from "../types/paradex";
import type { EtherealFundingEntry } from "../types/ethereal";
import type { DydxFundingEntry } from "../types/dydx";
import { buildTableRows } from "../utils/table";
import { saveSnapshot } from "../utils/snapshot";

export type RowStatus =
  | "idle"
  | "waiting-edgex"
  | "waiting-lighter"
  | "waiting-grvt"
  | "ready"
  | "empty";

interface FundingRowsArgs {
  edgexFunding: Record<string, EdgexFundingEntry>;
  lighterRates: LighterFundingEntry[];
  grvtFunding: Record<string, number>;
  asterRates: AsterFundingEntry[];
  backpackRates?: BackpackFundingEntry[];
  binanceRates?: Array<{ symbol: string; rate: number }>;
  variationalRates?: VariationalFundingEntry[];
  paradexRates?: ParadexFundingEntry[];
  etherealRates?: EtherealFundingEntry[];
  dydxRates?: DydxFundingEntry[];
  // spreads?: Record<string, number>; // Removed generic spread
  initialRows: TableRow[];
  initialLastUpdated: Date | null;
}

interface FundingRowsState {
  rows: TableRow[];
  lastUpdated: Date | null;
  status: RowStatus;
}

export const useFundingRows = ({
  edgexFunding,
  lighterRates,
  grvtFunding,
  asterRates,
  backpackRates = [],
  binanceRates = [],
  variationalRates = [],
  paradexRates = [],
  etherealRates = [],
  dydxRates = [],
  // spreads = {},
  initialRows,
  initialLastUpdated,
}: FundingRowsArgs): FundingRowsState => {
  const [rows, setRows] = useState<TableRow[]>(initialRows);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialLastUpdated);
  const [status, setStatus] = useState<RowStatus>(initialRows.length ? "ready" : "idle");

  useEffect(() => {
    const hasEdgexData = Object.keys(edgexFunding).length > 0;
    const hasLighterData = lighterRates.length > 0;
    const hasGrvtData = Object.keys(grvtFunding).length > 0;
    const hasAsterData = asterRates.length > 0;
    const hasBackpackData = backpackRates.length > 0;
    const hasVariationalData = variationalRates.length > 0;
    const hasParadexData = paradexRates.length > 0;
    const hasEtherealData = etherealRates.length > 0;
    const hasDydxData = dydxRates.length > 0;

    if (!hasEdgexData && !hasLighterData && !hasGrvtData && !hasAsterData && !hasBackpackData && !hasVariationalData && !hasParadexData && !hasEtherealData && !hasDydxData) {
      setStatus(initialRows.length ? "ready" : "idle");
      return;
    }

    if (!hasEdgexData) {
      setStatus("waiting-edgex");
      return;
    }

    if (!hasLighterData) {
      setStatus("waiting-lighter");
      return;
    }

    if (!hasGrvtData) {
      setStatus("waiting-grvt");
    }

    const nextRows = buildTableRows(edgexFunding, lighterRates, grvtFunding, asterRates, backpackRates, binanceRates, variationalRates, paradexRates, etherealRates, dydxRates, {}, {}, {}, {});

    if (!nextRows.length) {
      setRows([]);
      setStatus("empty");
      return;
    }

    setRows(nextRows);
    setStatus(hasGrvtData ? "ready" : "waiting-grvt");

    const timestamp = new Date();
    setLastUpdated(timestamp);
    void saveSnapshot({ rows: nextRows, lastUpdated: timestamp.toISOString() });
  }, [edgexFunding, lighterRates, grvtFunding, asterRates, backpackRates, binanceRates, variationalRates, paradexRates, etherealRates, dydxRates, initialRows.length]);

  return { rows, lastUpdated, status };
};
