import { fetchBinancePremiumIndex } from "./src/services/http/binance";

async function check() {
  const data = await fetchBinancePremiumIndex();
  const eth = data.find(d => d.symbol === "ETHUSDT");
  console.log("Binance ETH:", eth?.lastFundingRate);
}
check();
