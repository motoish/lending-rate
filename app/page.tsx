"use client"

import ratesData from "@src/data/rates.json"
import trendsData from "@src/data/trends.json"
import {
  formatRateDate,
  isRatesPayload,
  rateTypes,
  type RateEntry,
  type RatesPayload,
  type RateType,
} from "@src/lib/rates"
import { findTrendTarget, type InteractiveTrendSeries } from "@src/lib/trend-chart"
import { isTrendsPayload, type TrendBankId, type TrendsPayload } from "@src/lib/trends"
import { type FocusEvent, type PointerEvent, useEffect, useMemo, useState } from "react"

type Locale = "zh" | "ja"

if (!isRatesPayload(ratesData)) throw new Error("Bundled rates data is invalid")
const bundledRates = ratesData
if (!isTrendsPayload(trendsData)) throw new Error("Bundled trends data is invalid")
const bundledTrends = trendsData

const copy = {
  zh: {
    navTrend: "变化趋势",
    navMethod: "说明",
    eyebrow: "日本住宅贷款利率概要",
    updated: "数据更新",
    source: "数据来源：価格.com",
    variable: "变动利率",
    fixed: "固定利率",
    full: "全期间固定",
    from: "最低",
    annual: "年利率",
    banks: "银行 / 方案",
    term: "期限",
    note: "条件备注",
    variableScope: "各方案条件不同，数字不能直接当作到手利率。",
    fixedScope: "表内含固定2年与固定3年，期限不同不可直接比较。",
    fullScope: "フラット35与银行自营全期间固定混排，产品类型不同不可直接比较。",
    rank: "排名",
    trendTitle: "五大银行变动利率变化",
    trendPeriod: "近1年",
    trendScope: "新借款・下限利率・每月",
    trendUpdated: "更新至",
    trendAria: "五大银行近一年变动利率折线图",
    method1: "本页显示価格.com公布的适用利率下限或最低值，并保留贷款产品名称。",
    method2:
      "同一银行可能有多个产品；审核结果、借入比例、团信、手续费和地区条件都会影响最终适用利率。",
    method3: "利率会变化，签约前请务必以各银行官网和正式合同为准。",
    showMore: "显示其余 {n} 个方案",
    showLess: "收起",
    footer: "日本住宅贷款利率比较",
    disclaimer: "本页面仅供信息参考，不构成金融建议。",
  },
  ja: {
    navTrend: "推移グラフ",
    navMethod: "見方",
    eyebrow: "日本住宅ローン金利情報",
    updated: "データ基準日",
    source: "出典：価格.com",
    variable: "変動金利",
    fixed: "固定金利",
    full: "全期間固定",
    from: "最低",
    annual: "年利",
    banks: "金融機関 / プラン",
    term: "期間",
    note: "条件メモ",
    variableScope: "条件が違うため、数字をそのまま適用金利とはみなせません。",
    fixedScope: "当初固定2年と3年が混在しており、期間が違うため直接比較できません。",
    fullScope:
      "フラット35と銀行独自の全期間固定が混在しており、商品タイプが違うため直接比較できません。",
    rank: "順位",
    trendTitle: "5大銀行の変動金利推移",
    trendPeriod: "直近1年",
    trendScope: "新規借入・下限金利・月次",
    trendUpdated: "更新",
    trendAria: "5大銀行の直近1年間の変動金利折れ線グラフ",
    method1:
      "価格.comに掲載された適用金利の下限値、または最低金利を掲載しています。商品名も残しています。",
    method2:
      "同じ金融機関でも複数プランがあります。審査結果、借入比率、団信、手数料、地域などにより適用金利は変わります。",
    method3: "金利は変動するため、契約前に必ず各金融機関の公式サイトと契約書をご確認ください。",
    showMore: "残り{n}件を表示",
    showLess: "閉じる",
    footer: "日本の住宅ローン金利比較",
    disclaimer: "本ページは情報提供を目的とし、金融アドバイスではありません。",
  },
} as const

const scopeCopy = {
  variable: "variableScope",
  fixed: "fixedScope",
  full: "fullScope",
} as const

function localizedField(entry: RateEntry, locale: Locale, field: "product" | "term" | "note") {
  if (locale === "zh") {
    return field === "note" ? entry.noteZh || "—" : entry[`${field}Zh`]
  }
  return field === "note" ? entry.note || "—" : entry[field]
}

const visibleRowCount = 5
const localeStorageKey = "lending-rate-locale"
const trendColors: Record<TrendBankId, string> = {
  mufg: "#c23b33",
  smbc: "#16705c",
  mizuho: "#315f85",
  risona: "#9a6718",
  smtb: "#70558f",
}

function htmlLang(locale: Locale) {
  return locale === "ja" ? "ja" : "zh-CN"
}

function readStoredLocale() {
  try {
    const saved = window.localStorage.getItem(localeStorageKey)
    if (saved === "ja" || saved === "zh") return saved
  } catch {
    return null
  }
  return null
}

function applyLocale(locale: Locale) {
  document.documentElement.lang = htmlLang(locale)
  document.title = copy[locale].footer
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(localeStorageKey, locale)
  } catch {
    return
  }
}

function RateTable({
  locale,
  type,
  entries,
}: {
  locale: Locale
  type: RateType
  entries: RateEntry[]
}) {
  const t = copy[locale]
  const [isExpanded, setIsExpanded] = useState(false)
  const isExpandable = entries.length > visibleRowCount
  const visibleEntries = isExpanded || !isExpandable ? entries : entries.slice(0, visibleRowCount)
  const hiddenCount = entries.length - visibleRowCount
  return (
    <section id={type} className="rate-section">
      <div className="section-heading">
        <h2>{t[type]}</h2>
        <p className="section-scope" lang={locale === "ja" ? "ja" : "zh-CN"}>
          {t[scopeCopy[type]]}
        </p>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>{t.rank}</th>
              <th>{t.banks}</th>
              <th>{t.term}</th>
              <th>{t.annual}</th>
              <th>{t.note}</th>
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((entry, index) => (
              <tr key={`${type}-${entry.bank}-${entry.product}-${entry.term}`}>
                <td className="rank">#{String(index + 1).padStart(2, "0")}</td>
                <td className="bank-cell">
                  <div className="bank-name">{entry.bank}</div>
                  <div className="product-name">{localizedField(entry, locale, "product")}</div>
                </td>
                <td className="term">
                  <span className="mobile-label">{t.term}</span>
                  <span>{localizedField(entry, locale, "term")}</span>
                </td>
                <td className="rate-cell">
                  <span className="mobile-label">{t.annual}</span>
                  <span className="rate-value">{entry.displayRate}</span>
                  <span className="rate-unit">{t.from}</span>
                </td>
                <td className="note">
                  <span className="mobile-label">{t.note}</span>
                  <span>{localizedField(entry, locale, "note")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isExpandable ? (
          <button
            type="button"
            className="table-toggle"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? t.showLess : t.showMore.replace("{n}", String(hiddenCount))}
          </button>
        ) : null}
      </div>
    </section>
  )
}

function formatTrendMonth(month: string, locale: Locale) {
  const [year, value] = month.split("-")
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "zh-CN", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${year}-${value}-01T00:00:00Z`))
}

function RateTrendChart({ locale, trends }: { locale: Locale; trends: TrendsPayload }) {
  const t = copy[locale]
  const [interaction, setInteraction] = useState<{
    bankId: TrendBankId
    pointIndex?: number
    position?: { x: number; y: number }
  }>()
  const width = 960
  const height = 320
  const left = 54
  const right = 18
  const top = 18
  const bottom = 42
  const months = Array.from(
    new Set(trends.series.flatMap((series) => series.points.map((point) => point.month))),
  )
    .sort()
    .slice(-12)
  const rates = trends.series.flatMap((series) =>
    series.points.filter((point) => months.includes(point.month)).map((point) => point.rate),
  )
  const minimum = Math.floor(Math.min(...rates) * 10) / 10
  const maximum = Math.ceil(Math.max(...rates) * 10) / 10
  const upper = maximum === minimum ? maximum + 0.1 : maximum
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const x = (month: string) =>
    left + (months.indexOf(month) / Math.max(months.length - 1, 1)) * plotWidth
  const y = (rate: number) => top + ((upper - rate) / (upper - minimum)) * plotHeight
  const yTicks = Array.from({ length: 5 }, (_, index) => minimum + ((upper - minimum) * index) / 4)
  const visibleLabels = new Set([0, 3, 6, 9, months.length - 1])
  const plottedSeries = trends.series.map((series) => {
    const points = series.points.filter((point) => months.includes(point.month))
    return {
      ...series,
      points,
      chartPoints: points.map((point) => ({ x: x(point.month), y: y(point.rate) })),
    }
  })
  const interactiveSeries: InteractiveTrendSeries[] = plottedSeries.map((series) => ({
    bankId: series.bankId,
    points: series.chartPoints,
  }))
  const activeSeries = interaction
    ? plottedSeries.find((series) => series.bankId === interaction.bankId)
    : undefined
  const activePoint =
    interaction?.pointIndex === undefined ? undefined : activeSeries?.points[interaction.pointIndex]

  function bankName(series: (typeof plottedSeries)[number]) {
    return locale === "zh" ? series.bankZh : series.bank
  }

  function positionTooltip(event: PointerEvent<SVGSVGElement>) {
    const stage = event.currentTarget.closest<HTMLElement>(".trend-chart-stage")
    if (!stage) return undefined
    const rect = stage.getBoundingClientRect()
    return {
      x: Math.min(Math.max(event.clientX - rect.left, 8), Math.max(rect.width - 190, 8)),
      y: Math.max(event.clientY - rect.top, 48),
    }
  }

  function handleChartPointerMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const scale = rect.width / width
    const target = findTrendTarget(
      interactiveSeries,
      {
        x: ((event.clientX - rect.left) / rect.width) * width,
        y: ((event.clientY - rect.top) / rect.height) * height,
      },
      12 / scale,
      7 / scale,
    )
    if (!target) {
      setInteraction(undefined)
      return
    }
    setInteraction({ ...target, position: positionTooltip(event) })
  }

  function handleSeriesFocus(
    event: FocusEvent<SVGPolylineElement>,
    series: (typeof plottedSeries)[number],
  ) {
    const svg = event.currentTarget.ownerSVGElement
    const latest = series.chartPoints.at(-1)
    if (!svg || !latest) return
    const rect = svg.getBoundingClientRect()
    setInteraction({
      bankId: series.bankId,
      position: {
        x: Math.min((latest.x / width) * rect.width, Math.max(rect.width - 190, 8)),
        y: Math.max((latest.y / height) * rect.height, 48),
      },
    })
  }

  return (
    <section id="trend" className="trend-section">
      <div className="trend-heading">
        <div>
          <h2>{t.trendTitle}</h2>
          <p>{t.trendScope}</p>
        </div>
        <div className="trend-meta">
          <strong>{t.trendPeriod}</strong>
          <span>
            {t.trendUpdated} {formatRateDate(trends.updatedAt, locale)}
          </span>
        </div>
      </div>
      <div className="trend-chart-scroll">
        <div className="trend-chart-stage">
          <svg
            className="trend-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={t.trendAria}
            onPointerMove={handleChartPointerMove}
            onPointerLeave={() => setInteraction(undefined)}
          >
            <title>{t.trendAria}</title>
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  className="trend-grid"
                  x1={left}
                  x2={width - right}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text className="trend-axis-label" x={left - 10} y={y(tick) + 4} textAnchor="end">
                  {tick.toFixed(2)}%
                </text>
              </g>
            ))}
            {months.map((month, index) =>
              visibleLabels.has(index) ? (
                <text
                  className="trend-axis-label"
                  key={month}
                  x={x(month)}
                  y={height - 14}
                  textAnchor={
                    index === 0 ? "start" : index === months.length - 1 ? "end" : "middle"
                  }
                >
                  {month.replace("-", "/")}
                </text>
              ) : null,
            )}
            {plottedSeries.map((series) => {
              const color = trendColors[series.bankId]
              const state = interaction
                ? interaction.bankId === series.bankId
                  ? "active"
                  : "muted"
                : "idle"
              const polylinePoints = series.chartPoints
                .map((point) => `${point.x},${point.y}`)
                .join(" ")
              return (
                <g className={`trend-series trend-series--${state}`} key={series.bankId}>
                  <polyline className="trend-line" points={polylinePoints} stroke={color} />
                  <polyline
                    className="trend-focus-target"
                    points={polylinePoints}
                    stroke={color}
                    tabIndex={0}
                    role="img"
                    aria-label={bankName(series)}
                    onFocus={(event) => handleSeriesFocus(event, series)}
                    onBlur={() => setInteraction(undefined)}
                  />
                  {series.points.map((point, pointIndex) => (
                    <circle
                      className="trend-point"
                      key={point.month}
                      cx={series.chartPoints[pointIndex].x}
                      cy={series.chartPoints[pointIndex].y}
                      r={state === "active" ? 4 : 3}
                      fill={color}
                    >
                      <title>{`${bankName(series)}・${formatTrendMonth(point.month, locale)}・${point.rate.toFixed(3)}%`}</title>
                    </circle>
                  ))}
                </g>
              )
            })}
          </svg>
          {activeSeries && interaction?.position ? (
            <div
              className="trend-tooltip"
              role="status"
              style={{ left: interaction.position.x, top: interaction.position.y }}
            >
              <span
                className="trend-tooltip-swatch"
                style={{ backgroundColor: trendColors[activeSeries.bankId] }}
              />
              <strong>{bankName(activeSeries)}</strong>
              {activePoint ? (
                <>
                  <span>{formatTrendMonth(activePoint.month, locale)}</span>
                  <b>{activePoint.rate.toFixed(3)}%</b>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <ul className="trend-legend">
        {trends.series.map((series) => {
          const latest = series.points.at(-1)
          const state = interaction
            ? interaction.bankId === series.bankId
              ? "active"
              : "muted"
            : "idle"
          return (
            <li
              className={`trend-legend-item trend-legend-item--${state}`}
              key={series.bankId}
              onPointerEnter={() => setInteraction({ bankId: series.bankId })}
              onPointerLeave={() => setInteraction(undefined)}
            >
              <span
                className="trend-swatch"
                style={{ backgroundColor: trendColors[series.bankId] }}
              />
              <span>{locale === "zh" ? series.bankZh : series.bank}</span>
              <strong>{latest?.rate.toFixed(3)}%</strong>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function LendingRatePage({
  initialRates,
  initialTrends = bundledTrends,
}: {
  initialRates: RatesPayload
  initialTrends?: TrendsPayload
}) {
  const [locale, setLocale] = useState<Locale>("zh")
  const [rates, setRates] = useState(initialRates)
  const [trends, setTrends] = useState(initialTrends)
  const [isHydrated, setIsHydrated] = useState(false)
  const t = copy[locale]
  const summary = useMemo(
    () => rateTypes.map((key) => ({ key, value: rates[key][0].displayRate })),
    [rates],
  )

  useEffect(() => {
    const saved = readStoredLocale()
    if (saved) setLocale(saved)
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void fetch("/api/trends", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Trends request failed with ${response.status}`)
        return response.json()
      })
      .then((value: unknown) => {
        if (isTrendsPayload(value)) setTrends(value)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    applyLocale(locale)
    persistLocale(locale)
  }, [isHydrated, locale])

  useEffect(() => {
    const controller = new AbortController()

    void fetch("/api/rates", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Rates request failed with ${response.status}`)
        return response.json()
      })
      .then((value: unknown) => {
        if (isRatesPayload(value)) setRates(value)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
      })

    return () => controller.abort()
  }, [])

  return (
    <main>
      <div id="top" className="hero-wrap">
        <section className="hero">
          <div className="hero-heading">
            <h1>{t.eyebrow}</h1>
            <div className="language-toggle" role="group" aria-label="Language">
              <button
                className={locale === "zh" ? "active" : ""}
                aria-pressed={locale === "zh"}
                onClick={() => setLocale("zh")}
              >
                中文
              </button>
              <span>/</span>
              <button
                className={locale === "ja" ? "active" : ""}
                aria-pressed={locale === "ja"}
                onClick={() => setLocale("ja")}
              >
                日本語
              </button>
            </div>
          </div>
          <div className="summary-strip" aria-label="lowest rates">
            {summary.map(({ key, value }) => (
              <a href={`#${key}`} className="summary-card" key={key}>
                <span>
                  {t[key]}（{t.from}）
                </span>
                <strong>{value}</strong>
              </a>
            ))}
          </div>
          <div className="hero-meta">
            <span>
              {t.updated} <strong>{formatRateDate(rates.updatedAt, locale)}</strong>
            </span>
          </div>
        </section>
      </div>
      <div className="content-wrap">
        {rateTypes.map((key) => (
          <RateTable key={key} locale={locale} type={key} entries={rates[key]} />
        ))}
        <RateTrendChart locale={locale} trends={trends} />
        <section id="method" className="method-section">
          <p className="method-label">{t.navMethod}</p>
          <ol>
            <li>{t.method1}</li>
            <li>{t.method2}</li>
            <li>{t.method3}</li>
          </ol>
        </section>
      </div>
      <footer className="site-footer">
        <span>{t.footer}</span>
        <span>{t.disclaimer}</span>
        <a href="https://kakaku.com/housing-loan/" target="_blank" rel="noreferrer">
          {t.source} ↗
        </a>
      </footer>
    </main>
  )
}

export default function Home() {
  return <LendingRatePage initialRates={bundledRates} initialTrends={bundledTrends} />
}
