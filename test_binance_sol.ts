import { fetchBinancePremiumIndex } from "./src/services/http/binance";

async function check() {
  const data = await fetchBinancePremiumIndex();
  const sol = data.find(d => d.symbol === "SOLUSDT");
  console.log("Binance SOL:", sol?.lastFundingRate);
}
check();
