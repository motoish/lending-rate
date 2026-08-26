# lending-rate

A bilingual website for comparing Japanese home loan rates in Chinese and Japanese.

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

## Features

- Compare variable, fixed-term, and full-term fixed home loan rates.
- Browse the ten lowest-rate plans collected from Kakaku.com.
- Start in Chinese and switch to Japanese at any time.
- Keep the selected language between visits.
- Use a compact, responsive layout on desktop and mobile.
- Reserve monthly trend data for future 1, 3, and 5-year charts.

## Quick Start

Requires [Bun](https://bun.sh/) 1.4.0 and Node.js 22.13.0 or later.

```bash
bun install
bun run dev
```

Open [http://localhost:6565](http://localhost:6565).

## Commands

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `bun run dev`          | Start the local development server |
| `bun test`             | Run the test suite                 |
| `bun run lint`         | Check the code with Oxlint         |
| `bun run format`       | Format the project with Oxfmt      |
| `bun run format:check` | Check formatting without changes   |
| `bun run build`        | Create the production build        |
| `bun run deploy`       | Deploy the build with Wrangler     |

## Rate Data

Current rates are stored in [`data/rates.json`](data/rates.json). Each record contains the
financial institution, product name, term, display rate, conditions, source URL, and Chinese
translations where needed.

When updating rates:

1. Keep ten records in each rate category.
2. Sort records by the numeric `rate` field from low to high.
3. Update the data date displayed in `app/page.tsx`.
4. Run `bun test` to verify the data.

Future chart configuration lives in [`data/trends.json`](data/trends.json). The trend section
remains hidden until monthly snapshots are available.

## Deployment

Pushes to `main` are deployed through [GitHub Actions](.github/workflows/deploy.yml). The workflow
installs dependencies with Bun, runs tests and Oxc checks, builds the site, and deploys the
`lending-rate` Worker with Wrangler.

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
