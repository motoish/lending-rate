export type RateType = "variable" | "fixed" | "full"

export type RateEntry = {
  bank: string
  product: string
  productZh: string
  term: string
  termZh: string
  rate: number
  displayRate: string
  note: string
  noteZh: string
  source: string
}

export type RatesByType = Record<RateType, RateEntry[]>

export type RatesPayload = RatesByType & {
  version: 1
  updatedAt: string
  fetchedAt: string | null
}

export const rateTypes: RateType[] = ["variable", "fixed", "full"]

export function formatRateDate(value: string, _locale: "zh" | "ja") {
  const match = value.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (!match) return value
  return `${match[1]}年${Number(match[2])}月`
}

function isRateEntry(value: unknown): value is RateEntry {
  if (typeof value !== "object" || value === null) return false
  const entry = value as Partial<RateEntry>
  return (
    typeof entry.bank === "string" &&
    entry.bank.length > 0 &&
    typeof entry.product === "string" &&
    typeof entry.productZh === "string" &&
    typeof entry.term === "string" &&
    typeof entry.termZh === "string" &&
    typeof entry.rate === "number" &&
    Number.isFinite(entry.rate) &&
    typeof entry.displayRate === "string" &&
    typeof entry.note === "string" &&
    typeof entry.noteZh === "string" &&
    typeof entry.source === "string"
  )
}

export function isRatesPayload(value: unknown): value is RatesPayload {
  if (typeof value !== "object" || value === null) return false
  const payload = value as Partial<RatesPayload>
  if (
    payload.version !== 1 ||
    typeof payload.updatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.updatedAt) ||
    (payload.fetchedAt !== null && typeof payload.fetchedAt !== "string")
  ) {
    return false
  }

  return rateTypes.every((type) => {
    const entries = payload[type]
    return (
      Array.isArray(entries) &&
      entries.length === 10 &&
      entries.every(isRateEntry) &&
      entries.every((entry, index) => index === 0 || entries[index - 1].rate <= entry.rate)
    )
  })
}
