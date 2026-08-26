import { expect, test } from "bun:test";
import { GET } from "../app/api/rates/route";
import { isRatesPayload } from "../lib/rates";

test("serves bundled rates when a Cloudflare KV binding is unavailable", async () => {
  const response = await GET();
  const value: unknown = await response.json();

  expect(response.status).toBe(200);
  expect(isRatesPayload(value)).toBe(true);
  if (!isRatesPayload(value)) throw new Error("Expected a valid rates payload");
  const payload = value;
  expect(payload).toMatchObject({ version: 1, updatedAt: "2026-08-01", fetchedAt: null });
  expect(payload.variable).toHaveLength(10);
  expect(response.headers.get("cache-control")).toContain("s-maxage=300");
});
