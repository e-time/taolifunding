import { fetchBinancePremiumIndex } from "./src/services/http/binance";

async function check() {
  const data = await fetchBinancePremiumIndex();
  const btc = data.find(d => d.symbol === "BTCUSDT");
  console.log("Binance BTC:", btc?.lastFundingRate);
}
check();
