import { expect, test } from "bun:test"

import { formatRateDate, type RateEntry, type RatesPayload } from "@src/lib/rates"
import { loadRates } from "@src/lib/rates-store"

function entry(index: number): RateEntry {
  const rate = 0.5 + index / 100
  return {
    bank: `銀行${index}`,
    product: `商品${index}`,
    productZh: `产品${index}`,
    term: "変動",
    termZh: "变动",
    rate,
    displayRate: `${rate.toFixed(3)}%`,
    note: "",
    noteZh: "",
    source: "https://kakaku.com/housing-loan/",
  }
}

const entries = Array.from({ length: 10 }, (_, index) => entry(index))

const fallback = {
  version: 1,
  updatedAt: "2026-08-01",
  fetchedAt: null,
  variable: entries,
  fixed: entries,
  full: entries,
} satisfies RatesPayload

test("loads a valid current payload from KV", async () => {
  const current = { ...fallback, updatedAt: "2026-09-01", fetchedAt: "2026-09-01T01:00:00Z" }
  const kv = { get: async () => current }

  await expect(loadRates(kv, fallback)).resolves.toEqual(current)
})

test("uses bundled data when KV is empty or malformed", async () => {
  await expect(loadRates({ get: async () => null }, fallback)).resolves.toEqual(fallback)
  await expect(
    loadRates({ get: async () => ({ ...fallback, variable: null }) }, fallback),
  ).resolves.toEqual(fallback)
})

test("formats the payload source month for both interfaces", () => {
  expect(formatRateDate("2026-08-01", "zh")).toBe("2026年8月")
  expect(formatRateDate("2026-08-01", "ja")).toBe("2026年8月")
})
