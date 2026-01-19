import { fetchLighterFundingRates } from "./src/services/http/lighter";
import { fetchBinancePremiumIndex, fetchBinanceFundingInfo, fetchBinanceBookTicker } from "./src/services/http/binance";
import { fetchGrvtFundingRates } from "./src/services/http/grvt";
import { fetchAsterFundingRates, fetchAsterBookTicker } from "./src/services/http/aster";
import { fetchBackpackFundingRates } from "./src/services/http/backpack";
import { fetchHyperliquidPredictedFundings, mapHlPerpToEntries } from "./src/services/http/hyperliquid";
import { fetchVariationalFundingRates, fetchVariationalBookTicker } from "./src/services/http/variational";
import { fetchParadexFundingRates, fetchParadexBookTicker } from "./src/services/http/paradex";
import { fetchEtherealFundingRates } from "./src/services/http/ethereal";
import { fetchDydxFundingRates } from "./src/services/http/dydx";
import { EdgexClient } from "./src/server/edgex-client";
import { buildTableRows } from "./src/utils/table";
import { normaliseSymbol } from "./src/utils/format";

const edgexClient = new EdgexClient();
edgexClient.start();

let cache = {
  lighter: [] as any[],
  binance: [] as any[],
  grvt: {} as Record<string, number>,
  aster: [] as any[],
  backpack: [] as any[],
  hyperliquid: [] as any[],
  variational: [] as any[],
  paradex: [] as any[],
  ethereal: [] as any[],
  dydx: [] as any[],
  binanceSpreads: {} as Record<string, number>,
  asterSpreads: {} as Record<string, number>,
  paradexSpreads: {} as Record<string, number>,
  variationalSpreads: {} as Record<string, number>,
  lastUpdated: new Date(),
};

async function updateCache() {
  console.log("Updating funding rates cache...");
  const start = Date.now();

  try {
    const [lighter, binanceIndex, binanceInfo, binanceTicker, grvt, aster, asterTicker, backpack, hlPredicted, variational, variationalTicker, paradex, paradexTicker, ethereal, dydx] = await Promise.allSettled([
      fetchLighterFundingRates(),
      fetchBinancePremiumIndex(),
      fetchBinanceFundingInfo(),
      fetchBinanceBookTicker(),
      fetchGrvtFundingRates(),
      fetchAsterFundingRates(),
      fetchAsterBookTicker(),
      fetchBackpackFundingRates(),
      fetchHyperliquidPredictedFundings(),
      fetchVariationalFundingRates(),
      fetchVariationalBookTicker(),
      fetchParadexFundingRates(),
      fetchParadexBookTicker(),
      fetchEtherealFundingRates(),
      fetchDydxFundingRates(),
    ]);

    if (lighter.status === "fulfilled") cache.lighter = lighter.value;
    else console.error("Lighter fetch failed:", lighter.reason);

    if (binanceIndex.status === "fulfilled" && binanceInfo.status === "fulfilled") {
        const intervalMap = binanceInfo.value;
        cache.binance = binanceIndex.value
            .filter((entry) => entry.nextFundingTime > 0 && entry.lastFundingRate !== "0.00000000")
            .map((entry) => {
                const fundingRate = parseFloat(entry.lastFundingRate);
                const intervalHours = intervalMap.get(entry.symbol.toUpperCase()) ?? 8;
                return {
                    symbol: entry.symbol,
                    rate: fundingRate * (8 / intervalHours),
                };
            });
    }

    if (binanceTicker.status === "fulfilled") {
        cache.binanceSpreads = {};
        binanceTicker.value.forEach(t => {
            const bid = parseFloat(t.bidPrice);
            const ask = parseFloat(t.askPrice);
            if (bid > 0 && ask > 0) {
                cache.binanceSpreads[t.symbol.toUpperCase()] = (ask - bid) / ask;
            }
        });
    }

    if (grvt.status === "fulfilled") cache.grvt = grvt.value;
    if (aster.status === "fulfilled") cache.aster = aster.value;
    
    if (asterTicker.status === "fulfilled") {
        cache.asterSpreads = {};
        asterTicker.value.forEach(t => {
            const bid = parseFloat(t.bidPrice);
            const ask = parseFloat(t.askPrice);
            if (bid > 0 && ask > 0) {
                const symbol = t.symbol.replace("USDT", "").toUpperCase();
                cache.asterSpreads[symbol] = (ask - bid) / ask;
            }
        });
    }

    if (backpack.status === "fulfilled") cache.backpack = backpack.value;
    if (hlPredicted.status === "fulfilled") cache.hyperliquid = mapHlPerpToEntries(hlPredicted.value);
    
    if (variational.status === "fulfilled") cache.variational = variational.value;
    if (variationalTicker.status === "fulfilled") {
        cache.variationalSpreads = {};
        variationalTicker.value.forEach(t => {
            const bid = parseFloat(t.bidPrice);
            const ask = parseFloat(t.askPrice);
            if (bid > 0 && ask > 0) {
                cache.variationalSpreads[t.symbol.toUpperCase()] = (ask - bid) / ask;
            }
        });
    }

    if (paradex.status === "fulfilled") cache.paradex = paradex.value;
    if (paradexTicker.status === "fulfilled") {
        cache.paradexSpreads = {};
        paradexTicker.value.forEach(t => {
            const bid = parseFloat(t.bidPrice);
            const ask = parseFloat(t.askPrice);
            if (bid > 0 && ask > 0) {
                cache.paradexSpreads[t.symbol.toUpperCase()] = (ask - bid) / ask;
            }
        });
    }

    if (ethereal.status === "fulfilled") cache.ethereal = ethereal.value;
    if (dydx.status === "fulfilled") cache.dydx = dydx.value;

    cache.lastUpdated = new Date();
    
    // Log verification sample
    const btcSpread = cache.binanceSpreads['BTCUSDT'] || 0;
    const asterBtcSpread = cache.asterSpreads['BTC'] || 0;
    const paradexBtcSpread = cache.paradexSpreads['BTC'] || 0;
    
    console.log(`Cache updated in ${Date.now() - start}ms`);
    console.log(`[Sample Spreads] BTC - Binance: ${(btcSpread*100).toFixed(4)}% | Aster: ${(asterBtcSpread*100).toFixed(4)}% | Paradex: ${(paradexBtcSpread*100).toFixed(4)}%`);
  } catch (e) {
    console.error("Error updating cache:", e);
  }
}

// Initial update
updateCache();

// Poll every 60 seconds (adjust as needed, CLI uses 5 mins for some, but web users expect faster)
setInterval(updateCache, 60 * 1000);

const server = Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);

    // Enable CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      });
    }

    if (url.pathname === "/api/rates") {
      // Build the aggregated rows using the existing utility
      // Note: buildTableRows expects specific types.
      // We need to map our cache to what buildTableRows expects.
      
      const rows = buildTableRows(
        edgexClient.getData(), // Edgex from WS
        cache.lighter,
        cache.grvt,
        cache.aster,
        cache.backpack,
        cache.binance,
        cache.variational,
        cache.paradex,
        cache.ethereal,
        cache.dydx,
        cache.binanceSpreads,
        cache.asterSpreads,
        cache.paradexSpreads,
        cache.variationalSpreads
      );

      return new Response(JSON.stringify({
        rows,
        lastUpdated: cache.lastUpdated,
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
