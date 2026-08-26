import ratesData from "../../../data/rates.json";
import { isRatesPayload } from "../../../lib/rates";
import { loadRates } from "../../../lib/rates-store";

const fallbackRates = (() => {
  if (!isRatesPayload(ratesData)) throw new Error("Bundled rates data is invalid");
  return ratesData;
})();

export const dynamic = "force-dynamic";

export async function GET() {
  const reader = await import("cloudflare:workers")
    .then(({ env }) => env.RATES_KV)
    .catch(() => undefined);
  const rates = await loadRates(reader, fallbackRates);
  return Response.json(rates, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
