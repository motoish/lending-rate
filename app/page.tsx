"use client";

import { useEffect, useMemo, useState } from "react";
import ratesData from "@src/data/rates.json";
import {
  formatRateDate,
  isRatesPayload,
  rateTypes,
  type RateEntry,
  type RatesPayload,
  type RateType,
} from "@src/lib/rates";

type Locale = "zh" | "ja";

if (!isRatesPayload(ratesData)) throw new Error("Bundled rates data is invalid");
const bundledRates = ratesData;

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
    trendTitle: "五大银行利率变化",
    trendDesc: "未来将加入三菱UFJ、三井住友、瑞穗、りそな、三井住友信託近1/3/5年的变化折线图。",
    coming: "趋势图即将上线",
    trendNote: "数据结构已预留，后续接入月度快照后自动绘制。",
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
    trendTitle: "5大銀行の金利推移",
    trendDesc:
      "三菱UFJ・三井住友・みずほ・りそな・三井住友信託の直近1/3/5年の推移グラフを追加予定です。",
    coming: "推移グラフは準備中",
    trendNote: "データ構造を先に用意しています。月次スナップショット追加後に自動描画します。",
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
} as const;

const scopeCopy = {
  variable: "variableScope",
  fixed: "fixedScope",
  full: "fullScope",
} as const;

function localizedField(entry: RateEntry, locale: Locale, field: "product" | "term" | "note") {
  if (locale === "zh") {
    return field === "note" ? entry.noteZh || "—" : entry[`${field}Zh`];
  }
  return field === "note" ? entry.note || "—" : entry[field];
}

const visibleRowCount = 5;
const isTrendReady = false;
const localeStorageKey = "lending-rate-locale";

function htmlLang(locale: Locale) {
  return locale === "ja" ? "ja" : "zh-CN";
}

function readStoredLocale() {
  try {
    const saved = window.localStorage.getItem(localeStorageKey);
    if (saved === "ja" || saved === "zh") return saved;
  } catch {
    return null;
  }
  return null;
}

function applyLocale(locale: Locale) {
  document.documentElement.lang = htmlLang(locale);
  document.title = copy[locale].footer;
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(localeStorageKey, locale);
  } catch {
    return;
  }
}

function RateTable({
  locale,
  type,
  entries,
}: {
  locale: Locale;
  type: RateType;
  entries: RateEntry[];
}) {
  const t = copy[locale];
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandable = entries.length > visibleRowCount;
  const visibleEntries = isExpanded || !isExpandable ? entries : entries.slice(0, visibleRowCount);
  const hiddenCount = entries.length - visibleRowCount;
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
              <tr key={`${type}-${entry.bank}-${entry.term}`}>
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
  );
}

export function LendingRatePage({ initialRates }: { initialRates: RatesPayload }) {
  const [locale, setLocale] = useState<Locale>("zh");
  const [rates, setRates] = useState(initialRates);
  const [isHydrated, setIsHydrated] = useState(false);
  const t = copy[locale];
  const summary = useMemo(
    () => rateTypes.map((key) => ({ key, value: rates[key][0].displayRate })),
    [rates],
  );

  useEffect(() => {
    const saved = readStoredLocale();
    if (saved) setLocale(saved);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    applyLocale(locale);
    persistLocale(locale);
  }, [isHydrated, locale]);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/rates", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Rates request failed with ${response.status}`);
        return response.json();
      })
      .then((value: unknown) => {
        if (isRatesPayload(value)) setRates(value);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });

    return () => controller.abort();
  }, []);

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
        {/* TODO: show five-bank rate trends once monthly snapshots exist in data/trends.json. */}
        {isTrendReady ? (
          <section id="trend" className="trend-section">
            <div className="trend-copy">
              <div className="section-kicker">{t.navTrend}</div>
              <h2>{t.trendTitle}</h2>
              <p>{t.trendDesc}</p>
            </div>
            <div className="trend-status" aria-label={t.coming}>
              <strong>{t.coming}</strong>
              <span>{t.trendNote}</span>
            </div>
          </section>
        ) : null}
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
  );
}

export default function Home() {
  return <LendingRatePage initialRates={bundledRates} />;
}
