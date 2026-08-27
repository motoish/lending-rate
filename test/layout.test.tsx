import { expect, test } from "bun:test"

import Home, { LendingRatePage } from "@src/app/page"
import ratesData from "@src/data/rates.json"
import { renderToStaticMarkup } from "react-dom/server"

test("puts the rate summary before supporting metadata", () => {
  const html = renderToStaticMarkup(<Home />)
  const summary = html.match(/<div class="summary-strip"[^>]*>(.*?)<\/div>/s)?.[1]

  expect(html.indexOf('class="summary-strip"')).toBeGreaterThan(-1)
  expect(html.indexOf('class="hero-meta"')).toBeGreaterThan(-1)
  expect(html.indexOf('class="summary-strip"')).toBeLessThan(html.indexOf('class="hero-meta"'))
  expect(summary).toContain("变动利率（最低）")
  expect(summary).toContain("固定利率（最低）")
  expect(summary).toContain("全期间固定（最低）")
  expect(summary).not.toContain("↗")
})

test("renders the source month and rates from the supplied payload", () => {
  const current = {
    ...ratesData,
    version: 1 as const,
    updatedAt: "2026-09-01",
    fetchedAt: "2026-09-01T01:00:00.000Z",
    variable: [
      { ...ratesData.variable[0], rate: 0.777, displayRate: "0.777%" },
      ...ratesData.variable.slice(1),
    ],
  }
  const html = renderToStaticMarkup(<LendingRatePage initialRates={current} />)

  expect(html).toContain('<div class="hero-meta"><span>数据更新 <strong>2026年9月</strong>')
  expect(html).toContain("0.777%")
})

test("keeps the kakaku source attribution only in the footer", () => {
  const html = renderToStaticMarkup(<Home />)
  const heroMeta = html.match(/<div class="hero-meta">(.*?)<\/div>/s)?.[1]
  const footer = html.match(/<footer class="site-footer">(.*?)<\/footer>/s)?.[1]

  expect(heroMeta).toContain("数据更新")
  expect(heroMeta).not.toContain("数据来源")
  expect(heroMeta).not.toContain("kakaku.com")
  expect(footer).toContain("数据来源：価格.com")
  expect(footer).toContain("https://kakaku.com/housing-loan/")
  expect(footer).toContain("日本住宅贷款利率比较")
  expect(footer).not.toContain("LoanScope")
})

test("does not render per-row source links", () => {
  const html = renderToStaticMarkup(<Home />)
  const firstRow = html.match(/<tbody><tr[^>]*>(.*?)<\/tr>/s)?.[1]

  expect(firstRow).toBeDefined()
  expect(firstRow?.match(/<td/g)).toHaveLength(5)
  expect(firstRow).not.toContain("source-link")
  expect(html.match(/<tbody>[\s\S]*<\/tbody>/g)?.join("")).not.toContain("kakaku.com")
})

test("keeps the page title and language controls together without a separate header", () => {
  const html = renderToStaticMarkup(<Home />)
  const headingRow = html.match(/<div class="hero-heading">(.*?)<\/div>/s)?.[1]

  expect(html).not.toContain('<header class="site-header"')
  expect(headingRow).toContain("<h1")
  expect(headingRow).toContain('class="language-toggle"')
})

test("renders scroll controls in the right-side page nav", () => {
  const html = renderToStaticMarkup(<Home />)
  const navTag = html.match(/<nav class="page-nav"[^>]*>/)?.[0]
  const nav = html.match(/<nav class="page-nav"[^>]*>(.*?)<\/nav>/s)?.[1]

  expect(navTag).toContain('aria-label="页面导航"')
  expect(navTag).toContain('aria-hidden="true"')
  expect(navTag).not.toContain("page-nav--visible")
  expect(nav).toContain('aria-label="上一段"')
  expect(nav).toContain('aria-label="下一段"')
  expect(nav).toContain('aria-label="返回顶部"')
  expect(nav?.match(/class="page-nav-button"/g)).toHaveLength(3)
  expect(nav?.match(/page-nav-icon/g)?.length).toBeGreaterThanOrEqual(3)
  expect(nav).not.toContain("⬆️")
  expect(nav).not.toContain('href="#variable"')
})

test("treats the rate type as the section title without a plan subtitle", () => {
  const html = renderToStaticMarkup(<Home />)
  const variableSection = html.match(/<section id="variable"[^>]*>(.*?)<\/section>/s)?.[1]

  expect(variableSection).toBeDefined()
  expect(variableSection).toContain("<h2>变动利率</h2>")
  expect(variableSection).not.toContain("section-sub")
  expect(variableSection).not.toContain("低利率方案")
  expect(variableSection).not.toContain("Top 10")
})

test("shows Chinese product, term, and note copy in the default locale", () => {
  const html = renderToStaticMarkup(<Home />)
  const firstRow = html.match(/<tbody><tr[^>]*>(.*?)<\/tr>/s)?.[1]

  expect(firstRow).toContain("関西みらい銀行")
  expect(firstRow).toContain("住宅贷款（融资手续费型）")
  expect(firstRow).toContain("变动")
  expect(firstRow).toContain("最大降息优惠适用时")
  expect(firstRow).not.toContain("住宅ローン 融資手数料型")
  expect(firstRow).not.toContain(">変動<")
})

test("explains that ranking mixes terms and product types", () => {
  const html = renderToStaticMarkup(<Home />)
  const variableSection = html.match(/<section id="variable"[^>]*>(.*?)<\/section>/s)?.[1]
  const fixedSection = html.match(/<section id="fixed"[^>]*>(.*?)<\/section>/s)?.[1]
  const fullSection = html.match(/<section id="full"[^>]*>(.*?)<\/section>/s)?.[1]

  expect(variableSection).toContain("各方案条件不同，数字不能直接当作到手利率")
  expect(fixedSection).toContain("固定2年与固定3年")
  expect(fullSection).toContain("フラット35")
  expect(fullSection).toContain("不可直接比较")
})

test("renders the method copy as a quiet note instead of a feature block", () => {
  const html = renderToStaticMarkup(<Home />)
  const method = html.match(/<section id="method"[^>]*>(.*?)<\/section>/s)?.[1]

  expect(method).toContain("说明")
  expect(method).toContain("<ol>")
  expect(method).toContain("本页显示価格.com公布的适用利率下限或最低值")
  expect(method).not.toContain("<h2>")
  expect(method).not.toContain("NOTE")
  expect(method).not.toContain("先看清口径")
  expect(method).not.toContain("<b>01</b>")
})

test("does not advertise a plan subtitle or visible Top 10 count", () => {
  const html = renderToStaticMarkup(<Home />)

  expect(html).not.toContain("低利率方案")
  expect(html).not.toContain("低金利プラン")
  expect(html).not.toContain("section-sub")
  expect(html).not.toContain("Top 10")
  expect(html).not.toContain("10 个方案")
  expect(html).not.toContain("section-count")
})

test("marks the active language and keeps document metadata off the internal name", async () => {
  const html = renderToStaticMarkup(<Home />)
  const layout = await Bun.file(new URL("../app/layout.tsx", import.meta.url)).text()
  const page = await Bun.file(new URL("../app/page.tsx", import.meta.url)).text()

  expect(html).toContain('aria-pressed="true"')
  expect(page).toContain("lending-rate-locale")
  expect(page).toContain("document.documentElement.lang")
  expect(layout).toContain('title: "日本住宅贷款利率比较"')
  expect(layout).not.toContain("LoanScope")
})

test("shows five rate rows by default and offers to expand the rest", () => {
  const html = renderToStaticMarkup(<Home />)

  for (const id of ["variable", "fixed", "full"]) {
    const section = html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))?.[0]
    const body = section?.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0]
    expect(body?.match(/<tr/g)).toHaveLength(5)
  }

  expect(html).toContain("显示其余 5 个方案")
  expect(html).not.toContain("#06")
})

test("renders the one-year five-bank variable-rate trend", () => {
  const html = renderToStaticMarkup(<Home />)

  expect(html).toContain('id="trend"')
  expect(html).toContain("五大银行变动利率变化")
  expect(html).toContain("近1年")
  expect(html).toContain("<svg")
  expect(html).toContain("三菱UFJ银行")
  expect(html).toContain("三井住友信托银行")
  expect(html).not.toContain("趋势图即将上线")
})

test("does not expose a native title tooltip for the whole trend chart", () => {
  const html = renderToStaticMarkup(<Home />)

  expect(html).not.toContain("<title>五大银行近一年变动利率折线图</title>")
})

test("exposes every bank trend as an accessible interaction target", () => {
  const html = renderToStaticMarkup(<Home />)

  expect(html.match(/class="trend-focus-target"/g)).toHaveLength(5)
  expect(html).toContain('aria-label="三菱UFJ银行"')
  expect(html).toContain('aria-label="三井住友信托银行"')
})

test("groups the trend chart and bank legend in one responsive layout", () => {
  const html = renderToStaticMarkup(<Home />)

  expect(html).toMatch(
    /<div class="trend-chart-layout"><div class="trend-chart-scroll">[\s\S]*<ul class="trend-legend">/,
  )
})

test("keeps reading sizes at or above the review floor", async () => {
  const css = await Bun.file(new URL("../app/globals.css", import.meta.url)).text()

  expect(css).toMatch(/body \{[^}]*font-size: 14px;/s)
  expect(css).toMatch(/\.hero-heading h1 \{[^}]*font-size: 24px;/s)
  expect(css).toMatch(/\.table-shell td \{[^}]*font-size: 14px;/s)
  expect(css).toMatch(/\.note \{[^}]*font-size: 12px !important;/s)
  expect(css).toMatch(/\.product-name \{[^}]*font-size: 12px;/s)
  expect(css).toMatch(/\.section-scope\[lang="ja"\] \{[^}]*white-space: nowrap;/s)
  expect(css).toMatch(/\.summary-card strong \{[^}]*color: var\(--rate\);/s)
  expect(css).toMatch(/\.rate-value \{[^}]*color: var\(--rate\);/s)
  expect(css).toMatch(/\.summary-card span \{[^}]*font-weight: 650;/s)
  expect(css).toMatch(/\.summary-card \{[^}]*border-bottom: 1px solid var\(--muted\);/s)
  expect(css).not.toMatch(/\.summary-card span \{[^}]*text-decoration: underline;/s)
  expect(css).toMatch(/\.summary-card:hover \{[^}]*background:/s)
  expect(css).not.toMatch(/\.summary-strip \{[^}]*border: 1px solid var\(--line\);/s)
  expect(css).toMatch(/\.table-shell table \{[^}]*table-layout: fixed;/s)
  expect(css).toMatch(/\.table-shell \{[^}]*border-top: 1px solid var\(--line\);/s)
  expect(css).not.toMatch(/\.table-shell \{[^}]*border: 1px solid var\(--line\);/s)
  expect(css).toMatch(/\.term \{[^}]*white-space: nowrap;/s)
  expect(css).toMatch(/\.trend-tooltip \{[^}]*width: max-content;/s)
  expect(css).not.toMatch(/\.trend-tooltip \{[^}]*max-width:/s)
  expect(css).toMatch(/@media \(max-width: 700px\) \{[\s\S]*td:nth-child\(3\),[\s\S]*width: auto;/)
})
