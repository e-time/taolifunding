import type { EdgexFundingEntry, EdgexQuoteEventMessage, EdgexWsMessage } from "../types/edgex";
import { parseNumber } from "../utils/format";

const EDGEX_WS_ENDPOINT = "wss://quote.edgex.exchange/api/v1/public/ws";
const EDGEX_TICKER_CHANNEL = "ticker.all.1s";
const MIN_NOTIONAL = 10_000;
const RECONNECT_DELAY_MS = 5_000;

const DECODER = new TextDecoder();

const parseEventData = (eventData: unknown): EdgexWsMessage | null => {
  if (!eventData) return null;
  try {
    if (typeof eventData === "string") {
      return JSON.parse(eventData) as EdgexWsMessage;
    }
    // Bun's WebSocket message data can be string or Buffer (Uint8Array)
    if (eventData instanceof ArrayBuffer || ArrayBuffer.isView(eventData)) {
       const text = DECODER.decode(eventData);
       return JSON.parse(text) as EdgexWsMessage;
    }

    return JSON.parse(String(eventData)) as EdgexWsMessage;
  } catch (error) {
    console.error("Failed to parse edgeX websocket payload", error);
    return null;
  }
};

export class EdgexClient {
  private data: Record<string, EdgexFundingEntry> = {};
  private socket: WebSocket | null = null;
  private reconnectTimer: Timer | null = null;
  private shouldReconnect = true;

  public getData() {
    return this.data;
  }

  public start() {
    this.shouldReconnect = true;
    this.connect();
  }

  public stop() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private connect() {
    if (!this.shouldReconnect) return;

    try {
      const socket = new WebSocket(`${EDGEX_WS_ENDPOINT}?timestamp=${Date.now()}`);
      this.socket = socket;

      socket.onopen = () => {
        console.log("EdgeX WS connected");
        socket.send(JSON.stringify({ type: "subscribe", channel: EDGEX_TICKER_CHANNEL }));
      };

      socket.onmessage = (event) => {
        const parsed = parseEventData(event.data);
        this.handleMessage(parsed);
      };

      socket.onerror = (err) => {
        console.error("EdgeX WS error:", err);
      };

      socket.onclose = () => {
        console.log("EdgeX WS closed");
        this.scheduleReconnect();
      };
    } catch (e) {
      console.error("EdgeX WS connection failed:", e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private handleMessage(message: EdgexWsMessage | null) {
    if (!message) return;

    if (message.type === "ping") {
      const time = (message.time ?? String(Date.now())) as string;
      this.socket?.send(JSON.stringify({ type: "pong", time }));
      return;
    }

    if (message.type !== "quote-event") return;

    const quoteMessage = message as EdgexQuoteEventMessage;
    if (quoteMessage.channel !== EDGEX_TICKER_CHANNEL) return;

    const content = quoteMessage.content;
    if (!content || !Array.isArray(content.data)) return;

    const dataType = typeof content.dataType === "string" ? content.dataType.toLowerCase() : "";
    const isSnapshot = dataType === "snapshot";
    const entries = content.data;

    if (!entries.length && !isSnapshot) return;

    const updates: Record<string, EdgexFundingEntry> = {};
    const removals = new Set<string>();

    entries.forEach((entry) => {
      if (!entry?.contractId || !entry.contractName) return;

      const openInterest = parseNumber(entry.openInterest ?? undefined);
      const fundingRate = parseNumber(entry.fundingRate ?? undefined);
      const lastPrice = parseNumber(entry.lastPrice ?? undefined);

      const notional =
        openInterest !== null && lastPrice !== null ? openInterest * lastPrice : Number.NaN;

      if (
        openInterest === null ||
        lastPrice === null ||
        !Number.isFinite(openInterest) ||
        !Number.isFinite(lastPrice) ||
        !Number.isFinite(notional) ||
        notional < MIN_NOTIONAL
      ) {
        removals.add(entry.contractId);
        return;
      }

      if (fundingRate === null || !Number.isFinite(fundingRate)) {
        removals.add(entry.contractId);
        return;
      }

      const eightHourRate = fundingRate * 2;

      updates[entry.contractId] = {
        contractId: entry.contractId,
        contractName: entry.contractName,
        openInterest,
        fundingRate: eightHourRate,
        fundingRateTime: entry.fundingTime,
      };
    });

    if (isSnapshot) {
      this.data = updates;
    } else {
      removals.forEach((id) => {
        delete this.data[id];
      });
      Object.assign(this.data, updates);
    }
  }
}
