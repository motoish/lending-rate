import { isTrendsPayload, type TrendsPayload } from "@src/lib/trends"

export const latestTrendsKey = "rates:trends:v1"

type TrendsReader = {
  get(key: string, type: "json"): Promise<unknown>
}

export async function loadTrends(reader: TrendsReader | undefined, fallback: TrendsPayload) {
  if (!reader) return fallback

  try {
    const value = await reader.get(latestTrendsKey, "json")
    return isTrendsPayload(value) ? value : fallback
  } catch {
    return fallback
  }
}
