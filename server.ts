import { fetchLighterFundingRates } from "./src/services/http/lighter";
import { fetchBinancePremiumIndex, fetchBinanceFundingInfo, fetchBinanceBookTicker } from "./src/services/http/binance";
import { fetchGrvtFundingRates, fetchGrvtBookTicker } from "./src/services/http/grvt";
import { fetchAsterFundingRates, fetchAsterBookTicker } from "./src/services/http/aster";
import { fetchBackpackFundingRates } from "./src/services/http/backpack";
import { fetchHyperliquidPredictedFundings, mapHlPerpToEntries } from "./src/services/http/hyperliquid";
import { fetchVariationalFundingRates, fetchVariationalBookTicker } from "./src/services/http/variational";
import { fetchParadexFundingRates, fetchParadexBookTicker } from "./src/services/http/paradex";
import { fetchEtherealFundingRates, fetchEtherealBookTicker } from "./src/services/http/ethereal";
import { fetchDydxFundingRates } from "./src/services/http/dydx";
import { fetchNadoFundingRates, fetchNadoBookTicker } from "./src/services/http/nado";
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
  nado: [] as any[],
  binanceSpreads: {} as Record<string, number>,
  asterSpreads: {} as Record<string, number>,
  paradexSpreads: {} as Record<string, number>,
  variationalSpreads: {} as Record<string, number>,
  grvtSpreads: {} as Record<string, number>,
  etherealSpreads: {} as Record<string, number>,
  nadoSpreads: {} as Record<string, number>,
  marketPrices: {} as Record<string, Record<string, { bid: number, ask: number }>>,
  lastUpdated: new Date(),
};

async function updateCache() {
  console.log("Updating funding rates cache...");
  const start = Date.now();

  try {
    const [lighter, binanceIndex, binanceInfo, binanceTicker, grvt, grvtTicker, aster, asterTicker, backpack, hlPredicted, variational, variationalTicker, paradex, paradexTicker, ethereal, etherealTicker, dydx, nado, nadoTicker] = await Promise.allSettled([
      fetchLighterFundingRates(),
      fetchBinancePremiumIndex(),
      fetchBinanceFundingInfo(),
      fetchBinanceBookTicker(),
      fetchGrvtFundingRates(),
      fetchGrvtBookTicker(),
      fetchAsterFundingRates(),
      fetchAsterBookTicker(),
      fetchBackpackFundingRates(),
      fetchHyperliquidPredictedFundings(),
      fetchVariationalFundingRates(),
      fetchVariationalBookTicker(),
      fetchParadexFundingRates(),
      fetchParadexBookTicker(),
      fetchEtherealFundingRates(),
      fetchEtherealBookTicker(),
      fetchDydxFundingRates(),
      fetchNadoFundingRates(),
      fetchNadoBookTicker(),
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
        cache.marketPrices.binance = {};
        binanceTicker.value.forEach(t => {
            const bid = parseFloat(t.bidPrice);
            const ask = parseFloat(t.askPrice);
            const symbol = t.symbol.toUpperCase();
            if (bid > 0 && ask > 0) {
                cache.binanceSpreads[symbol] = (ask - bid) / ask;
                cache.marketPrices.binance[symbol] = { bid, ask };
            }
        });
    }

    if (grvt.status === "fulfilled") cache.grvt = grvt.value;
    if (grvtTicker.status === "fulfilled") {
        cache.grvtSpreads = {};
        cache.marketPrices.grvt = {};
        Object.entries(grvtTicker.value).forEach(([symbol, prices]) => {
            const { bid, ask } = prices;
            if (bid > 0 && ask > 0) {
                cache.grvtSpreads[symbol] = (ask - bid) / ask;
                cache.marketPrices.grvt[symbol] = { bid, ask };
            }
        });
    }

    if (aster.status === "fulfilled") cache.aster = aster.value;
    
    if (asterTicker.status === "fulfilled") {
        cache.asterSpreads = {};
        cache.marketPrices.aster = {};
        asterTicker.value.forEach(t => {
            const bid = parseFloat(t.bidPrice);
            const ask = parseFloat(t.askPrice);
            if (bid > 0 && ask > 0) {
                const symbol = t.symbol.replace("USDT", "").toUpperCase();
                cache.asterSpreads[symbol] = (ask - bid) / ask;
                cache.marketPrices.aster[symbol] = { bid, ask };
            }
        });
    }

    if (backpack.status === "fulfilled") cache.backpack = backpack.value;
    if (hlPredicted.status === "fulfilled") cache.hyperliquid = mapHlPerpToEntries(hlPredicted.value);
    
    if (variational.status === "fulfilled") cache.variational = variational.value;
    if (variationalTicker.status === "fulfilled") {
        cache.variationalSpreads = {};
        cache.marketPrices.variational = {};
        variationalTicker.value.forEach(t => {
            const bid = parseFloat(t.bidPrice);
            const ask = parseFloat(t.askPrice);
            if (bid > 0 && ask > 0) {
                const symbol = t.symbol.toUpperCase();
                cache.variationalSpreads[symbol] = (ask - bid) / ask;
                cache.marketPrices.variational[symbol] = { bid, ask };
            }
        });
    }

    if (paradex.status === "fulfilled") cache.paradex = paradex.value;
    if (paradexTicker.status === "fulfilled") {
        cache.paradexSpreads = {};
        cache.marketPrices.paradex = {};
        paradexTicker.value.forEach(t => {
            const bid = parseFloat(t.bidPrice);
            const ask = parseFloat(t.askPrice);
            const symbol = t.symbol.toUpperCase();
            if (bid > 0 && ask > 0) {
                cache.paradexSpreads[symbol] = (ask - bid) / ask;
                cache.marketPrices.paradex[symbol] = { bid, ask };
            }
        });
    }

    if (ethereal.status === "fulfilled") cache.ethereal = ethereal.value;
    if (etherealTicker.status === "fulfilled") {
        cache.etherealSpreads = {};
        cache.marketPrices.ethereal = {};
        Object.entries(etherealTicker.value).forEach(([symbol, prices]) => {
            const { bid, ask } = prices;
            if (bid > 0 && ask > 0) {
                cache.etherealSpreads[symbol] = (ask - bid) / ask;
                cache.marketPrices.ethereal[symbol] = { bid, ask };
            }
        });
    }

    if (dydx.status === "fulfilled") cache.dydx = dydx.value;

    if (nado.status === "fulfilled") cache.nado = nado.value;
    if (nadoTicker.status === "fulfilled") {
        cache.nadoSpreads = {};
        cache.marketPrices.nado = {};
        Object.entries(nadoTicker.value).forEach(([symbol, prices]) => {
            const { bid, ask } = prices;
            if (bid > 0 && ask > 0) {
                cache.nadoSpreads[symbol] = (ask - bid) / ask;
                cache.marketPrices.nado[symbol] = { bid, ask };
            }
        });
    }

    cache.lastUpdated = new Date();
    
    // Log verification sample
    const btcSpread = cache.binanceSpreads['BTCUSDT'] || 0;
    const nadoBtcSpread = cache.nadoSpreads['BTC'] || 0;
    
    console.log(`Cache updated in ${Date.now() - start}ms`);
    console.log(`[Sample Spreads] BTC - Binance: ${(btcSpread*100).toFixed(4)}% | Nado: ${(nadoBtcSpread*100).toFixed(4)}%`);
  } catch (e) {
    console.error("Error updating cache:", e);
  }
}

// Initial update
updateCache();

// Poll every 10 seconds for more responsive spread/cost data (Web users expect fast updates)
setInterval(updateCache, 10 * 1000);

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
        cache.nado,
        cache.binanceSpreads,
        cache.asterSpreads,
        cache.paradexSpreads,
        cache.variationalSpreads,
        cache.grvtSpreads,
        cache.etherealSpreads,
        cache.nadoSpreads,
        cache.marketPrices
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
