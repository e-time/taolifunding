import { fetchNadoFundingRates, fetchNadoBookTicker } from "./src/services/http/nado";

async function test() {
  console.log("Testing Nado Fetch...");
  try {
    const rates = await fetchNadoFundingRates();
    console.log("Rates count:", rates.length);
    console.log("Sample Rate (BTC):", rates.find(r => r.symbol === "BTC")?.rate);
    console.log("Sample Rate (SUI):", rates.find(r => r.symbol === "SUI")?.rate);
  } catch (e) {
    console.error("Rates Error:", e);
  }

  try {
    const ticker = await fetchNadoBookTicker();
    console.log("Ticker keys:", Object.keys(ticker).length);
    console.log("Sample Ticker (BTC):", ticker["BTC"]);
  } catch (e) {
    console.error("Ticker Error:", e);
  }
}

test();
