import type { TrendBankId } from "@src/lib/trends"

export type InteractiveTrendPoint = {
  x: number
  y: number
}

export type InteractiveTrendSeries = {
  bankId: TrendBankId
  points: InteractiveTrendPoint[]
}

export type TrendTarget = {
  bankId: TrendBankId
  pointIndex?: number
}

function squaredDistance(left: InteractiveTrendPoint, right: InteractiveTrendPoint) {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2
}

function squaredDistanceToSegment(
  cursor: InteractiveTrendPoint,
  start: InteractiveTrendPoint,
  end: InteractiveTrendPoint,
) {
  const segmentX = end.x - start.x
  const segmentY = end.y - start.y
  const segmentLength = segmentX ** 2 + segmentY ** 2
  if (segmentLength === 0) return squaredDistance(cursor, start)

  const projection =
    ((cursor.x - start.x) * segmentX + (cursor.y - start.y) * segmentY) / segmentLength
  const boundedProjection = Math.max(0, Math.min(1, projection))
  return squaredDistance(cursor, {
    x: start.x + segmentX * boundedProjection,
    y: start.y + segmentY * boundedProjection,
  })
}

export function findTrendTarget(
  series: InteractiveTrendSeries[],
  cursor: InteractiveTrendPoint,
  lineThreshold: number,
  pointThreshold: number,
): TrendTarget | undefined {
  let closestPoint: { bankId: TrendBankId; pointIndex: number; squaredDistance: number } | undefined

  for (const candidate of series) {
    candidate.points.forEach((point, pointIndex) => {
      const distance = squaredDistance(cursor, point)
      if (!closestPoint || distance < closestPoint.squaredDistance) {
        closestPoint = { bankId: candidate.bankId, pointIndex, squaredDistance: distance }
      }
    })
  }

  if (closestPoint && closestPoint.squaredDistance <= pointThreshold ** 2) {
    return { bankId: closestPoint.bankId, pointIndex: closestPoint.pointIndex }
  }

  let closestLine: { bankId: TrendBankId; squaredDistance: number } | undefined
  for (const candidate of series) {
    for (let index = 1; index < candidate.points.length; index += 1) {
      const distance = squaredDistanceToSegment(
        cursor,
        candidate.points[index - 1],
        candidate.points[index],
      )
      if (!closestLine || distance < closestLine.squaredDistance) {
        closestLine = { bankId: candidate.bankId, squaredDistance: distance }
      }
    }
  }

  if (closestLine && closestLine.squaredDistance <= lineThreshold ** 2) {
    return { bankId: closestLine.bankId }
  }
  return undefined
}
