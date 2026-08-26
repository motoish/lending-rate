import { describe, expect, test } from "bun:test"

import type { TrendsPayload } from "@src/lib/trends"
import { fetchLatestTrends, parseKakakuTrendPage, trendBanks } from "@src/scripts/trends-refresh"

function apiPage(startYear = 2025, startMonth = 9, offset = 0) {
  const data = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(startYear, startMonth - 1 + index, 1))
    const month = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/01`
    return {
      month,
      min0: (0.5 + offset + index / 100).toFixed(3),
      max0: (0.8 + offset + index / 100).toFixed(3),
      min1: (1.5 + offset).toFixed(3),
      max1: (1.8 + offset).toFixed(3),
    }
  })

  return new TextEncoder().encode(
    JSON.stringify({ name: ["\u5909\u52d5", "\u56fa\u5b9a10\u5e74"], data }),
  )
}

describe("parseKakakuTrendPage", () => {
  test("extracts twelve monthly lower variable rates", () => {
    const series = parseKakakuTrendPage(apiPage(), trendBanks[0])

    expect(series.bankId).toBe("mufg")
    expect(series.points).toHaveLength(12)
    expect(series.points[0]).toEqual({ month: "2025-09", rate: 0.5 })
    expect(series.points[11]).toEqual({ month: "2026-08", rate: 0.61 })
  })

  test("rejects incomplete history instead of publishing a broken line", () => {
    const value = JSON.parse(new TextDecoder().decode(apiPage()))
    value.data.pop()

    expect(() =>
      parseKakakuTrendPage(new TextEncoder().encode(JSON.stringify(value)), trendBanks[0]),
    ).toThrow("Expected 12 monthly trend points")
  })
})

test("merges current data into retained history and caps every bank at sixty months", async () => {
  const oldPoints = Array.from({ length: 60 }, (_, index) => {
    const date = new Date(Date.UTC(2020, 9 + index, 1))
    return {
      month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      rate: 0.2 + index / 100,
    }
  })
  const existing = {
    version: 1,
    updatedAt: "2025-09-01",
    fetchedAt: "2025-09-01T01:00:00.000Z",
    rateType: "variable",
    loanType: "new",
    rateBoundary: "lower",
    series: trendBanks.map((bank) => ({ ...bank, points: oldPoints })),
  } satisfies TrendsPayload

  const result = await fetchLatestTrends(
    existing,
    async (url) => {
      const bankIndex = trendBanks.findIndex((bank) => url.includes(`hl_ccd=${bank.companyCode}`))
      if (bankIndex < 0) throw new Error(`Unexpected trend URL: ${url}`)
      return apiPage(2025, 9, bankIndex / 10)
    },
    () => new Date("2026-08-26T01:00:00.000Z"),
  )

  expect(result.updatedAt).toBe("2026-08-01")
  expect(result.fetchedAt).toBe("2026-08-26T01:00:00.000Z")
  expect(result.series).toHaveLength(5)
  expect(result.series[0].points).toHaveLength(60)
  expect(result.series[0].points[0].month).toBe("2021-09")
  expect(result.series[0].points.at(-1)).toEqual({ month: "2026-08", rate: 0.61 })
})
