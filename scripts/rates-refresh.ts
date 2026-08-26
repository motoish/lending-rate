import { loadBuffer } from "cheerio";
import {
  isRatesPayload,
  rateTypes,
  type RateEntry,
  type RatesByType,
  type RatesPayload,
  type RateType,
} from "@src/lib/rates";

export const kakakuUrls: Record<RateType, string> = {
  variable: "https://kakaku.com/housing-loan/list/list.asp?hl_itype=1&hl_ltype=2&hl_sort=2",
  fixed: "https://kakaku.com/housing-loan/list/list.asp?hl_itype=2&hl_ltype=2&hl_sort=2",
  full: "https://kakaku.com/housing-loan/list/list.asp?hl_itype=3&hl_ltype=2&hl_sort=2",
};

type FetchPage = (url: string) => Promise<Uint8Array>;

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function identity(value: string) {
  return value.normalize("NFKC").replace(/[^\p{Letter}\p{Number}]/gu, "");
}

function productIdentity(value: string) {
  return identity(value.replace(/住宅ローン/g, "").replace(/\s+(?:変動|固定|全期間固定).*$/u, ""));
}

function existingTranslation(entries: RateEntry[], bank: string, product: string) {
  const normalizedBank = identity(bank);
  const normalizedProduct = productIdentity(product);
  return entries.find((entry) => {
    if (identity(entry.bank) !== normalizedBank) return false;
    const candidate = productIdentity(entry.product);
    return (
      candidate.length > 0 &&
      normalizedProduct.length > 0 &&
      (candidate.includes(normalizedProduct) || normalizedProduct.includes(candidate))
    );
  });
}

export function parseKakakuPage(
  bytes: Uint8Array,
  type: RateType,
  sourceUrl: string,
  existingRates: RatesByType,
) {
  const $ = loadBuffer(Buffer.from(bytes));
  const entries: RateEntry[] = [];
  let updatedAt = "";

  $(".p-planSearchList_item").each((_, element) => {
    const item = $(element);
    const bank = clean(item.find(".p-planSearchList_corporate").first().text());
    const product = clean(item.find(".p-planSearchList_plan").first().text());
    const term = clean(
      `${item.find(".p-icon_rateType_mainTxt").first().text()}${item.find(".p-icon_rateType_subTxt").first().text()}`,
    );
    const rateText = clean(item.find(".p-item_rate").first().text());
    const rateMatch = rateText.match(/(\d+(?:\.\d+)?)/);
    const dateText = clean(item.find(".p-item_rate_date").first().text());
    const dateMatch = dateText.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    const note = clean(item.find(".c-planCamp_note_item").first().text());
    const href = item.find(".p-planSearchList_name a").first().attr("href");

    if (!bank || !product || !term || !rateMatch || !dateMatch || !href) return;

    const rate = Number(rateMatch[1]);
    if (!Number.isFinite(rate)) return;

    const entryDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    updatedAt ||= entryDate;
    if (entryDate !== updatedAt) return;

    const translated = existingTranslation(existingRates[type], bank, product);
    entries.push({
      bank,
      product,
      productZh: translated?.productZh ?? product,
      term,
      termZh: translated?.termZh ?? term,
      rate,
      displayRate: `${rate.toFixed(3)}%`,
      note,
      noteZh: translated?.noteZh ?? note,
      source: new URL(href, sourceUrl).toString(),
    });
  });

  entries.sort((left, right) => left.rate - right.rate);
  if (entries.length < 10) {
    throw new Error(`Expected at least 10 valid ${type} plans, received ${entries.length}`);
  }

  return { updatedAt, entries: entries.slice(0, 10) };
}

async function downloadPage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "lending-rate/1.0 (+https://loan.motoish.dev)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Kakaku request failed with ${response.status}: ${url}`);

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) throw new Error(`Kakaku response is too large: ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 2_000_000) throw new Error(`Kakaku response is too large: ${url}`);
  return bytes;
}

export async function fetchLatestRates(
  existing: RatesPayload,
  fetchPage: FetchPage = downloadPage,
  now: () => Date = () => new Date(),
): Promise<RatesPayload> {
  const parsed = {} as Record<RateType, ReturnType<typeof parseKakakuPage>>;

  for (const type of rateTypes) {
    const url = kakakuUrls[type];
    parsed[type] = parseKakakuPage(await fetchPage(url), type, url, existing);
  }

  const sourceDates = new Set(rateTypes.map((type) => parsed[type].updatedAt));
  if (sourceDates.size !== 1) {
    throw new Error("Kakaku pages have inconsistent source dates");
  }

  return {
    version: 1,
    updatedAt: parsed.variable.updatedAt,
    fetchedAt: now().toISOString(),
    variable: parsed.variable.entries,
    fixed: parsed.fixed.entries,
    full: parsed.full.entries,
  };
}

type RefreshFileOptions = {
  existingPath: string;
  outputPath: string;
  fetchPage?: FetchPage;
  now?: () => Date;
};

export async function refreshRatesFile({
  existingPath,
  outputPath,
  fetchPage,
  now,
}: RefreshFileOptions) {
  const existingValue: unknown = await Bun.file(existingPath).json();
  if (!isRatesPayload(existingValue))
    throw new Error(`Invalid existing rates file: ${existingPath}`);

  const payload = await fetchLatestRates(existingValue, fetchPage, now);
  await Bun.write(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

if (import.meta.main) {
  const outputFlagIndex = Bun.argv.indexOf("--output");
  const outputPath = outputFlagIndex >= 0 ? Bun.argv[outputFlagIndex + 1] : undefined;
  if (!outputPath) throw new Error("Usage: bun run refresh-rates --output <path>");

  const payload = await refreshRatesFile({
    existingPath: new URL("../data/rates.json", import.meta.url).pathname,
    outputPath,
  });
  console.log(
    JSON.stringify({
      message: "Rates refreshed",
      updatedAt: payload.updatedAt,
      fetchedAt: payload.fetchedAt,
    }),
  );
}

export { rateTypes };
