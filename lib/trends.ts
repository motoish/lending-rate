export type TrendBankId = "mufg" | "smbc" | "mizuho" | "risona" | "smtb"

export type TrendBank = {
  bankId: TrendBankId
  companyCode: string
  bank: string
  bankZh: string
}

export type TrendPoint = {
  month: string
  rate: number
}

export type TrendSeries = TrendBank & {
  points: TrendPoint[]
}

export type TrendsPayload = {
  version: 1
  updatedAt: string
  fetchedAt: string | null
  rateType: "variable"
  loanType: "new"
  rateBoundary: "lower"
  series: TrendSeries[]
}

const bankIds: TrendBankId[] = ["mufg", "smbc", "mizuho", "risona", "smtb"]

function isTrendPoint(value: unknown): value is TrendPoint {
  if (typeof value !== "object" || value === null) return false
  const point = value as Partial<TrendPoint>
  return (
    typeof point.month === "string" &&
    /^\d{4}-\d{2}$/.test(point.month) &&
    typeof point.rate === "number" &&
    Number.isFinite(point.rate) &&
    point.rate >= 0
  )
}

function isTrendSeries(value: unknown): value is TrendSeries {
  if (typeof value !== "object" || value === null) return false
  const series = value as Partial<TrendSeries>
  return (
    typeof series.bankId === "string" &&
    bankIds.includes(series.bankId as TrendBankId) &&
    typeof series.companyCode === "string" &&
    /^\d{3}$/.test(series.companyCode) &&
    typeof series.bank === "string" &&
    series.bank.length > 0 &&
    typeof series.bankZh === "string" &&
    series.bankZh.length > 0 &&
    Array.isArray(series.points) &&
    series.points.length > 0 &&
    series.points.length <= 60 &&
    series.points.every(isTrendPoint) &&
    series.points.every(
      (point, index) => index === 0 || series.points![index - 1].month < point.month,
    )
  )
}

export function isTrendsPayload(value: unknown): value is TrendsPayload {
  if (typeof value !== "object" || value === null) return false
  const payload = value as Partial<TrendsPayload>
  if (
    payload.version !== 1 ||
    typeof payload.updatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.updatedAt) ||
    (payload.fetchedAt !== null && typeof payload.fetchedAt !== "string") ||
    payload.rateType !== "variable" ||
    payload.loanType !== "new" ||
    payload.rateBoundary !== "lower" ||
    !Array.isArray(payload.series) ||
    payload.series.length !== bankIds.length ||
    !payload.series.every(isTrendSeries)
  ) {
    return false
  }

  const presentIds = new Set(payload.series.map((series) => series.bankId))
  return bankIds.every((bankId) => presentIds.has(bankId))
}
