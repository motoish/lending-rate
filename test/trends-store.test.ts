import { expect, test } from "bun:test"

import { GET } from "@src/app/api/trends/route"
import trendsData from "@src/data/trends.json"
import { isTrendsPayload, type TrendsPayload } from "@src/lib/trends"
import { loadTrends } from "@src/lib/trends-store"

const fallback = trendsData as TrendsPayload

test("loads valid trend history from KV and rejects malformed history", async () => {
  const current = { ...fallback, updatedAt: "2026-09-01" }

  await expect(loadTrends({ get: async () => current }, fallback)).resolves.toEqual(current)
  await expect(
    loadTrends({ get: async () => ({ ...current, series: [] }) }, fallback),
  ).resolves.toEqual(fallback)
})

test("serves bundled trends when the Cloudflare KV binding is unavailable", async () => {
  const response = await GET()
  const value: unknown = await response.json()

  expect(response.status).toBe(200)
  expect(isTrendsPayload(value)).toBe(true)
  expect(response.headers.get("cache-control")).toContain("s-maxage=300")
})
