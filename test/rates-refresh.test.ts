import { describe, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import ratesData from "@src/data/rates.json"
import type { RateEntry, RatesByType, RatesPayload } from "@src/lib/rates"
import {
  fetchLatestRates,
  kakakuUrls,
  parseKakakuPage,
  refreshRatesFile,
} from "@src/scripts/rates-refresh"

const sourceUrl = "https://kakaku.com/housing-loan/list/list.asp?hl_itype=1&hl_ltype=2&hl_sort=2"

function rateItem(
  index: number,
  rate: number,
  options: Partial<RateEntry> & { date?: string } = {},
) {
  const bank = options.bank ?? `銀行${index}`
  const product = options.product ?? `住宅ローン${index}`
  const term = options.term ?? "変動金利"

  return `
    <li class="p-planSearchList_item">
      <h2 class="p-planSearchList_name">
        <a href="/housing-loan/item.asp?id=${index}">
          <span class="p-planSearchList_corporate">${bank}</span>
          <span class="p-planSearchList_plan">${product}</span>
        </a>
      </h2>
      <div class="p-icon_rateType_box">
        <span class="p-icon_rateType_mainTxt">${term}</span>
      </div>
      <span class="p-item_rate"><span class="p-item_rate_txt">年</span>${rate.toFixed(3)}<span class="p-item_rate_sub">%</span></span>
      <span class="p-item_rate_date">（${options.date ?? "2026/08/01"} 時点）</span>
      <ul class="c-planCamp_note"><li class="c-planCamp_note_item">条件${index}</li></ul>
    </li>`
}

function page(items: string[]) {
  return new TextEncoder().encode(`<!doctype html><meta charset="utf-8"><ul>${items.join("")}</ul>`)
}

function emptyRates(): RatesByType {
  return { variable: [], fixed: [], full: [] }
}

describe("parseKakakuPage", () => {
  test("returns the ten lowest valid plans and the source date", () => {
    const rates = [1.08, 0.95, 1.02, 0.84, 0.91, 1.11, 0.99, 0.89, 1.04, 0.87, 0.93]
    const result = parseKakakuPage(
      page(rates.map((rate, index) => rateItem(index + 1, rate))),
      "variable",
      sourceUrl,
      emptyRates(),
    )

    expect(result.updatedAt).toBe("2026-08-01")
    expect(result.entries).toHaveLength(10)
    expect(result.entries.map((entry) => entry.rate)).toEqual([
      0.84, 0.87, 0.89, 0.91, 0.93, 0.95, 0.99, 1.02, 1.04, 1.08,
    ])
    expect(result.entries[0].source).toBe("https://kakaku.com/housing-loan/item.asp?id=4")
  })

  test("keeps known Chinese copy and falls back to Japanese for a new plan", () => {
    const known: RateEntry = {
      bank: "既存銀行",
      product: "既存商品",
      productZh: "现有产品",
      term: "変動",
      termZh: "浮动利率",
      rate: 0.5,
      displayRate: "0.500%",
      note: "以前の条件",
      noteZh: "既有条件说明",
      source: sourceUrl,
    }
    const existing = emptyRates()
    existing.variable.push(known)
    const items = [rateItem(1, 0.5, { ...known, product: "既存商品 変動", term: "変動金利" })]
    for (let index = 2; index <= 10; index += 1) items.push(rateItem(index, 0.5 + index / 100))

    const result = parseKakakuPage(page(items), "variable", sourceUrl, existing)

    expect(result.entries[0]).toMatchObject({
      productZh: "现有产品",
      termZh: "浮动利率",
      noteZh: "既有条件说明",
    })
    expect(result.entries[1]).toMatchObject({
      productZh: "住宅ローン2",
      termZh: "変動金利",
      noteZh: "条件2",
    })
  })

  test("rejects a page that cannot provide a complete top ten", () => {
    const items = Array.from({ length: 9 }, (_, index) => rateItem(index + 1, 0.5 + index / 100))

    expect(() => parseKakakuPage(page(items), "variable", sourceUrl, emptyRates())).toThrow(
      "Expected at least 10 valid variable plans",
    )
  })
})

describe("fetchLatestRates", () => {
  test("builds one payload only after all three rate pages succeed", async () => {
    const fallback = {
      version: 1,
      updatedAt: "2026-07-01",
      fetchedAt: null,
      ...emptyRates(),
    } satisfies RatesPayload
    const calls: string[] = []
    const fetchPage = async (url: string) => {
      calls.push(url)
      const start = url === kakakuUrls.variable ? 0.6 : url === kakakuUrls.fixed ? 1.5 : 2.2
      return page(
        Array.from({ length: 10 }, (_, index) => rateItem(index + 1, start + index / 100)),
      )
    }

    const result = await fetchLatestRates(
      fallback,
      fetchPage,
      () => new Date("2026-08-26T01:00:00Z"),
    )

    expect(calls).toEqual([kakakuUrls.variable, kakakuUrls.fixed, kakakuUrls.full])
    expect(result).toMatchObject({
      version: 1,
      updatedAt: "2026-08-01",
      fetchedAt: "2026-08-26T01:00:00.000Z",
    })
    expect(result.variable).toHaveLength(10)
    expect(result.fixed).toHaveLength(10)
    expect(result.full).toHaveLength(10)
  })

  test("rejects mixed source dates instead of publishing partial data", async () => {
    const fallback = {
      version: 1,
      updatedAt: "2026-07-01",
      fetchedAt: null,
      ...emptyRates(),
    } satisfies RatesPayload
    const fetchPage = async (url: string) => {
      const date = url === kakakuUrls.full ? "2026/07/01" : "2026/08/01"
      return page(
        Array.from({ length: 10 }, (_, index) => rateItem(index + 1, 0.6 + index / 100, { date })),
      )
    }

    await expect(fetchLatestRates(fallback, fetchPage)).rejects.toThrow(
      "Kakaku pages have inconsistent source dates",
    )
  })
})

test("writes an upload-ready JSON file after a successful refresh", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lending-rate-test-"))
  const existingPath = join(directory, "existing.json")
  const outputPath = join(directory, "rates.json")
  const fallback = {
    ...ratesData,
    version: 1 as const,
  } satisfies RatesPayload
  await writeFile(existingPath, JSON.stringify(fallback), "utf8")

  try {
    await refreshRatesFile({
      existingPath,
      outputPath,
      fetchPage: async () =>
        page(Array.from({ length: 10 }, (_, index) => rateItem(index + 1, 0.6 + index / 100))),
      now: () => new Date("2026-08-26T01:00:00Z"),
    })

    const written = JSON.parse(await readFile(outputPath, "utf8")) as RatesPayload
    expect(written.updatedAt).toBe("2026-08-01")
    expect(written.fetchedAt).toBe("2026-08-26T01:00:00.000Z")
    expect(written.variable).toHaveLength(10)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
