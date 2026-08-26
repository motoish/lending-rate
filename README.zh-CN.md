# lending-rate

一个使用中文和日文比较日本住宅贷款利率的双语网站。

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

## 功能

- 比较变动利率、固定期限利率和全期间固定利率。
- 浏览从价格.com整理的十个最低利率方案。
- 默认显示中文，并可随时切换为日文。
- 在下次访问时保留所选择的语言。
- 为桌面端和手机端提供紧凑的响应式布局。
- 为未来的近1年、3年和5年利率趋势图预留月度数据。

## 快速开始

需要 [Bun](https://bun.sh/) 1.4.0，以及 Node.js 22.13.0 或更高版本。

```bash
bun install
bun run dev
```

打开 [http://localhost:6565](http://localhost:6565)。

## 常用命令

| 命令                   | 说明                       |
| ---------------------- | -------------------------- |
| `bun run dev`          | 启动本地开发服务器         |
| `bun test`             | 运行测试                   |
| `bun run lint`         | 使用 Oxlint 检查代码       |
| `bun run format`       | 使用 Oxfmt 格式化项目      |
| `bun run format:check` | 检查格式但不修改文件       |
| `bun run build`        | 创建生产构建               |
| `bun run deploy`       | 使用 Wrangler 部署生产构建 |

## 利率数据

当前利率保存在 [`data/rates.json`](data/rates.json)。每条记录包括金融机构、产品名称、期限、
展示利率、适用条件、来源地址，以及需要时使用的中文译文。

更新利率时：

1. 每个利率分类保留十条记录。
2. 按数值字段 `rate` 从低到高排序。
3. 更新 `app/page.tsx` 中显示的数据日期。
4. 运行 `bun test` 验证数据。

未来的趋势图配置保存在 [`data/trends.json`](data/trends.json)。在月度快照数据准备完成之前，
页面不会显示趋势图区域。

## 部署

推送到 `main` 后，[GitHub Actions](.github/workflows/deploy.yml) 会自动执行部署。工作流使用 Bun
安装依赖，运行测试和 Oxc 检查，构建网站，并通过 Wrangler 部署 `lending-rate` Worker。

运行工作流前，请在仓库中配置以下 secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Cloudflare 配置保存在 [`wrangler.jsonc`](wrangler.jsonc)。

## 免责声明

利率信息整理自[价格.com住宅贷款比较](https://kakaku.com/housing-loan/)。页面展示的数值可能是最低利率
或满足特定条件时的参考利率。实际适用利率会受到审核结果、借款比例、保险、手续费、地区及其他条件
的影响。

本项目仅供信息参考，不构成金融建议。申请贷款前，请务必向金融机构确认全部条件。
