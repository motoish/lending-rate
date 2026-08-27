import { expect, test } from "bun:test"

import { findTrendTarget, type InteractiveTrendSeries } from "@src/lib/trend-chart"

const series: InteractiveTrendSeries[] = [
  {
    bankId: "mufg",
    points: [
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ],
  },
  {
    bankId: "risona",
    points: [
      { x: 0, y: 24 },
      { x: 100, y: 24 },
    ],
  },
]

test("selects the closest line when two bank series nearly overlap", () => {
  expect(findTrendTarget(series, { x: 50, y: 23 }, 8, 4)).toEqual({ bankId: "risona" })
  expect(findTrendTarget(series, { x: 50, y: 21 }, 8, 4)).toEqual({ bankId: "mufg" })
})

test("returns the exact data point before the surrounding line", () => {
  expect(findTrendTarget(series, { x: 99, y: 23 }, 8, 4)).toEqual({
    bankId: "risona",
    pointIndex: 1,
  })
})

test("does not activate a bank away from every trend line", () => {
  expect(findTrendTarget(series, { x: 50, y: 60 }, 8, 4)).toBeUndefined()
})
