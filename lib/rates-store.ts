import { isRatesPayload, type RatesPayload } from "@src/lib/rates"

export const latestRatesKey = "rates:latest"

type RatesReader = {
  get(key: string, type: "json"): Promise<unknown>
}

export async function loadRates(reader: RatesReader | undefined, fallback: RatesPayload) {
  if (!reader) return fallback

  try {
    const value = await reader.get(latestRatesKey, "json")
    return isRatesPayload(value) ? value : fallback
  } catch {
    return fallback
  }
}
