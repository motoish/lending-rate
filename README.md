# LoanScope

LoanScope 是一个中日双语的日本住宅贷款利率比较网站，部署目标为
[loan.motoish.dev](https://loan.motoish.dev)。

网站基于价格.com公开信息，整理以下三类新借住宅贷款方案：

- 变动利率（変動金利）
- 固定利率（固定金利）
- 全期间固定利率（全期間固定金利）

每个分类展示最低利率方案 Top 10，并保留银行、产品、适用期限和利率条件。
五大银行近 1、3、5 年利率变化的数据结构已预留在
[`data/trends.json`](data/trends.json)，页面暂不展示，等月度快照就绪后再打开。

## 技术栈

- Bun
- React / Next.js
- Vinext / Vite
- Oxc（oxlint / oxfmt）
- Cloudflare Workers Static Assets
- GitHub Actions

## 本地开发

需要 Bun 1.4.0 和 Node.js 22.13.0 或更高版本。

```bash
bun install
bun run dev
```

本地开发服务器默认运行在 <http://localhost:6565>。

## 常用命令

```bash
# 运行测试
bun test

# 使用 Oxc 检查代码
bun run lint

# 使用 Oxc 格式化代码
bun run format

# 检查代码格式但不修改文件
bun run format:check

# 构建生产版本
bun run build

# 在不发布的情况下验证 Cloudflare 部署包
bunx wrangler deploy --dry-run
```

生产构建输出位于 `dist/`：

- `dist/server/`：Worker 入口及服务端模块
- `dist/client/`：浏览器静态资源

## 利率数据

当前利率数据保存在 [`data/rates.json`](data/rates.json)，数据基准日会同时显示在页面中。

每条记录包含：

| 字段          | 说明                                 |
| ------------- | ------------------------------------ |
| `bank`        | 银行或金融机构名称（日文）           |
| `product`     | 贷款产品名称（日文原文）             |
| `productZh`   | 贷款产品中文释义                     |
| `term`        | 利率类型及适用期限（日文）           |
| `termZh`      | 期限中文释义                         |
| `rate`        | 用于排序的最低数值利率               |
| `displayRate` | 页面展示的利率或利率区间             |
| `note`        | 优惠、审核或适用条件（日文）         |
| `noteZh`      | 条件备注中文释义                     |
| `source`      | 采集时使用的价格.com页面，页面不展示 |

更新数据时，请确保每个分类：

1. 保留 10 条记录。
2. 按 `rate` 从低到高排序。
3. 同步更新页面中的数据基准日。
4. 运行 `bun test` 验证数量和排序。

未来折线图配置保存在 [`data/trends.json`](data/trends.json)。目前已经定义目标银行和
1、3、5 年时间范围。`series` 会在加入月度历史数据后使用；在此之前页面不展示趋势区。

## 数据来源与免责声明

利率信息来源于[价格.com住宅贷款比较](https://kakaku.com/housing-loan/)。展示的利率通常是
适用利率下限或满足特定条件时的参考利率，实际利率可能受审核结果、借入比例、团体信用生命保险、
手续费和地区等条件影响。

本项目仅提供信息整理，不构成金融建议。申请贷款前，请以银行官网和正式合同为准。

## 部署

部署方式参考 `kalshirss`：代码推送到 `main` 后，
[`deploy.yml`](.github/workflows/deploy.yml) 会自动执行以下步骤：

1. 使用 Bun 锁定版本安装依赖。
2. 运行测试、Oxc lint 和格式检查。
3. 构建生产版本。
4. 使用 Wrangler 部署到 Cloudflare。

Wrangler 配置位于 [`wrangler.jsonc`](wrangler.jsonc)，其中声明了 Worker 名称、构建产物和
`loan.motoish.dev` 自定义域名。

GitHub 仓库需要配置以下 Actions secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

工作流也可以在 GitHub Actions 页面通过 `workflow_dispatch` 手动触发。

## 项目结构

```text
.
├── .github/workflows/deploy.yml  # Cloudflare 部署工作流
├── app/                          # 页面、布局和样式
├── data/                         # 利率与未来趋势数据
├── public/                       # 静态资源
├── test/                         # 数据完整性测试
├── .oxfmtrc.json                 # Oxfmt 格式化配置
├── bun.lock                      # Bun 锁文件
├── package.json                  # 项目脚本与依赖
├── vite.config.ts                # Vinext / Cloudflare 构建配置
└── wrangler.jsonc                # Cloudflare Worker 与域名配置
```
