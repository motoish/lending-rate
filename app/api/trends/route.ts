import trendsData from "@src/data/trends.json"
import { isTrendsPayload } from "@src/lib/trends"
import { loadTrends } from "@src/lib/trends-store"

const fallbackTrends = (() => {
  if (!isTrendsPayload(trendsData)) throw new Error("Bundled trends data is invalid")
  return trendsData
})()

export const dynamic = "force-dynamic"

export async function GET() {
  const reader = await import("cloudflare:workers")
    .then(({ env }) => env.RATES_KV)
    .catch(() => undefined)
  const trends = await loadTrends(reader, fallbackTrends)
  return Response.json(trends, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    },
  })
}
