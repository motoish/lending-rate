import bundledTrendsData from "@src/data/trends.json"
import {
  isTrendsPayload,
  type TrendBank,
  type TrendPoint,
  type TrendSeries,
  type TrendsPayload,
} from "@src/lib/trends"

export const trendBanks = [
  {
    bankId: "mufg",
    companyCode: "008",
    bank: "三菱ＵＦＪ銀行",
    bankZh: "三菱UFJ银行",
  },
  {
    bankId: "smbc",
    companyCode: "010",
    bank: "三井住友銀行",
    bankZh: "三井住友银行",
  },
  {
    bankId: "mizuho",
    companyCode: "009",
    bank: "みずほ銀行",
    bankZh: "瑞穗银行",
  },
  {
    bankId: "risona",
    companyCode: "013",
    bank: "りそな銀行",
    bankZh: "りそな银行",
  },
  {
    bankId: "smtb",
    companyCode: "017",
    bank: "三井住友信託銀行",
    bankZh: "三井住友信托银行",
  },
] as const satisfies readonly TrendBank[]

type FetchPage = (url: string) => Promise<Uint8Array>

type KakakuTrendResponse = {
  name: string[]
  data: Array<Record<string, unknown> & { month?: unknown }>
}

function isKakakuTrendResponse(value: unknown): value is KakakuTrendResponse {
  if (typeof value !== "object" || value === null) return false
  const response = value as Partial<KakakuTrendResponse>
  return (
    Array.isArray(response.name) &&
    response.name.every((name) => typeof name === "string") &&
    Array.isArray(response.data)
  )
}

function decodeTrendResponse(bytes: Uint8Array) {
  for (const encoding of ["shift_jis", "utf-8"] as const) {
    try {
      const value: unknown = JSON.parse(new TextDecoder(encoding).decode(bytes))
      if (isKakakuTrendResponse(value) && value.name.some((name) => name.includes("変動"))) {
        return value
      }
    } catch {
      continue
    }
  }
  throw new Error("Kakaku trend response is invalid")
}

export function parseKakakuTrendPage(bytes: Uint8Array, bank: TrendBank): TrendSeries {
  const response = decodeTrendResponse(bytes)
  const variableIndex = response.name.findIndex((name) => name.includes("変動"))
  const rateKey = `min${variableIndex}`
  const points: TrendPoint[] = []

  for (const item of response.data) {
    if (typeof item.month !== "string") continue
    const monthMatch = item.month.match(/^(\d{4})\/(\d{2})\/\d{2}$/)
    const rate = Number(item[rateKey])
    if (!monthMatch || !Number.isFinite(rate) || rate < 0) continue
    points.push({ month: `${monthMatch[1]}-${monthMatch[2]}`, rate })
  }

  const uniquePoints = Array.from(
    new Map(points.map((point) => [point.month, point] as const)).values(),
  ).sort((left, right) => left.month.localeCompare(right.month))
  if (uniquePoints.length !== 12) {
    throw new Error(
      `Expected 12 monthly trend points for ${bank.bankId}, received ${uniquePoints.length}`,
    )
  }

  return { ...bank, points: uniquePoints }
}

function trendUrl(companyCode: string) {
  const query = new URLSearchParams({
    hl_ccd: companyCode,
    hl_icd: "",
    hl_type: "json",
    hl_ltype: "2",
  })
  return `https://kakaku.com/housing-loan/chart/api_ratedata.ashx?${query}`
}

async function downloadTrendPage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "lending-rate/1.0 (+https://loan.motoish.dev)",
      Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
      Referer: "https://kakaku.com/housing-loan/",
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Kakaku trend request failed with ${response.status}: ${url}`)

  const contentLength = Number(response.headers.get("content-length") ?? 0)
  if (contentLength > 1_000_000) throw new Error(`Kakaku trend response is too large: ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > 1_000_000) throw new Error(`Kakaku trend response is too large: ${url}`)
  return bytes
}

function mergePoints(existing: TrendPoint[], current: TrendPoint[]) {
  return Array.from(
    new Map([...existing, ...current].map((point) => [point.month, point] as const)).values(),
  )
    .sort((left, right) => left.month.localeCompare(right.month))
    .slice(-60)
}

export async function fetchLatestTrends(
  existing: TrendsPayload | undefined,
  fetchPage: FetchPage = downloadTrendPage,
  now: () => Date = () => new Date(),
): Promise<TrendsPayload> {
  const series: TrendSeries[] = []

  for (const bank of trendBanks) {
    const current = parseKakakuTrendPage(await fetchPage(trendUrl(bank.companyCode)), bank)
    const previous = existing?.series.find((candidate) => candidate.bankId === bank.bankId)
    series.push({ ...current, points: mergePoints(previous?.points ?? [], current.points) })
  }

  const sourceMonths = new Set(series.map((item) => item.points.at(-1)?.month))
  if (sourceMonths.size !== 1 || sourceMonths.has(undefined)) {
    throw new Error("Kakaku trend pages have inconsistent source months")
  }
  const updatedMonth = series[0].points.at(-1)?.month
  if (!updatedMonth) throw new Error("Kakaku trend history is empty")

  return {
    version: 1,
    updatedAt: `${updatedMonth}-01`,
    fetchedAt: now().toISOString(),
    rateType: "variable",
    loanType: "new",
    rateBoundary: "lower",
    series,
  }
}

async function readExisting(path: string | undefined) {
  if (path) {
    try {
      const value: unknown = await Bun.file(path).json()
      if (isTrendsPayload(value)) return value
    } catch {
      // Use the bundled history when KV has not been initialized yet.
    }
  }
  return isTrendsPayload(bundledTrendsData) ? bundledTrendsData : undefined
}

export async function refreshTrendsFile({
  existingPath,
  outputPath,
  fetchPage,
  now,
}: {
  existingPath?: string
  outputPath: string
  fetchPage?: FetchPage
  now?: () => Date
}) {
  const payload = await fetchLatestTrends(await readExisting(existingPath), fetchPage, now)
  await Bun.write(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  return payload
}

if (import.meta.main) {
  const outputFlagIndex = Bun.argv.indexOf("--output")
  const existingFlagIndex = Bun.argv.indexOf("--existing")
  const outputPath = outputFlagIndex >= 0 ? Bun.argv[outputFlagIndex + 1] : undefined
  const existingPath = existingFlagIndex >= 0 ? Bun.argv[existingFlagIndex + 1] : undefined
  if (!outputPath) {
    throw new Error("Usage: bun run refresh-trends --output <path> [--existing <path>]")
  }

  const payload = await refreshTrendsFile({ existingPath, outputPath })
  console.log(
    JSON.stringify({
      message: "Trends refreshed",
      updatedAt: payload.updatedAt,
      fetchedAt: payload.fetchedAt,
      months: payload.series[0].points.length,
    }),
  )
}
