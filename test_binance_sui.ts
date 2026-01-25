import { fetchBinancePremiumIndex } from "./src/services/http/binance";

async function check() {
  const data = await fetchBinancePremiumIndex();
  const sui = data.find(d => d.symbol === "SUIUSDT");
  console.log("Binance SUI:", sui?.lastFundingRate);
}
check();
