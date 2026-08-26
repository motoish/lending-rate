# lending-rate

A bilingual website for comparing Japanese home loan rates in Chinese and Japanese.

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

## Features

- Compare variable, fixed-term, and full-term fixed home loan rates.
- Browse the ten lowest-rate plans collected from Kakaku.com.
- Start in Chinese and switch to Japanese at any time.
- Keep the selected language between visits.
- Use a compact, responsive layout on desktop and mobile.
- View one year of monthly variable-rate history for five major banks.

## Quick Start

Requires [Bun](https://bun.sh/) 1.4.0 and Node.js 22.13.0 or later.

```bash
bun install
bun run dev
```

Open [http://localhost:6565](http://localhost:6565).

## Commands

| Command                                            | Description                         |
| -------------------------------------------------- | ----------------------------------- |
| `bun run dev`                                      | Start the local development server  |
| `bun test`                                         | Run the test suite                  |
| `bun run lint`                                     | Check the code with Oxlint          |
| `bun run format`                                   | Format the project with Oxfmt       |
| `bun run format:check`                             | Check formatting without changes    |
| `bun run build`                                    | Create the production build         |
| `bun run refresh-rates --output /tmp/rates.json`   | Fetch and validate the latest rates |
| `bun run refresh-trends --output /tmp/trends.json` | Fetch and merge bank rate history   |
| `bun run deploy`                                   | Deploy the build with Wrangler      |

## Rate Data

Current production rates are read from the `RATES_KV` Cloudflare KV binding. GitHub Actions fetches
and validates Kakaku.com at 10:00 JST every day, then writes `rates:latest` and a dated
`rates:snapshot:YYYY-MM-DD` snapshot. [`data/rates.json`](data/rates.json) is the bundled fallback
for local development, the first deployment, or a temporarily unavailable KV value.

Each category is accepted only when it contains ten valid plans sorted by numeric rate. All three
Kakaku.com pages must also report the same source date before KV is updated. Existing Chinese copy
is preserved when a plan matches the bundled data; new plans fall back to Japanese until translated.

The same workflow fetches 12 months of lower variable rates for MUFG, SMBC, Mizuho, Resona, and
Sumitomo Mitsui Trust. It merges them with `rates:trends:v1` in KV and retains up to 60 monthly
points per bank. [`data/trends.json`](data/trends.json) is the bundled fallback. The site currently
shows the latest year; 3 and 5-year views can be enabled as bank-specific history accumulates.

## Deployment

Pushes to `main` are deployed through [GitHub Actions](.github/workflows/deploy.yml). The workflow
installs dependencies with Bun, runs tests and Oxc checks, builds the site, and deploys the
`lending-rate` Worker with Wrangler.

The [rate refresh workflow](.github/workflows/refresh-rates.yml) runs daily at 10:00 JST and can
also be started manually. Wrangler automatically provisions the `RATES_KV` namespace on the first
deployment and keeps it linked to the Worker.

Configure these repository secrets before running the workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Cloudflare configuration is stored in [`wrangler.jsonc`](wrangler.jsonc).

## Disclaimer

Rate information is summarized from
[Kakaku.com Home Loan Comparison](https://kakaku.com/housing-loan/). Published values may be
minimum or conditional rates. Actual offers can vary by screening result, loan-to-value ratio,
insurance, fees, region, and other requirements.

This project is for informational purposes only and does not provide financial advice. Confirm
all terms with the financial institution before applying.
