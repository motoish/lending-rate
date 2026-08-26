# lending-rate

日本の住宅ローン金利を中国語と日本語で比較できるバイリンガルサイトです。

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

## 特徴

- 変動金利、固定金利、全期間固定金利を比較できます。
- 価格.comから整理した低金利プラン10件を確認できます。
- 初期表示は中国語で、いつでも日本語に切り替えられます。
- 選択した言語は次回のアクセス時にも保持されます。
- デスクトップとモバイルの両方に対応したコンパクトなレイアウトです。
- 5大銀行の直近1年間の変動金利を月次グラフで確認できます。

## クイックスタート

[Bun](https://bun.sh/) 1.4.0とNode.js 22.13.0以降が必要です。

```bash
bun install
bun run dev
```

[http://localhost:6565](http://localhost:6565) を開きます。

## コマンド

| コマンド                                           | 説明                                     |
| -------------------------------------------------- | ---------------------------------------- |
| `bun run dev`                                      | ローカル開発サーバーを起動               |
| `bun test`                                         | テストを実行                             |
| `bun run lint`                                     | Oxlintでコードをチェック                 |
| `bun run format`                                   | Oxfmtでプロジェクトをフォーマット        |
| `bun run format:check`                             | ファイルを変更せずフォーマットをチェック |
| `bun run build`                                    | 本番用ビルドを作成                       |
| `bun run refresh-rates --output /tmp/rates.json`   | 最新金利を取得して検証                   |
| `bun run refresh-trends --output /tmp/trends.json` | 銀行別の金利履歴を取得・マージ           |
| `bun run deploy`                                   | Wranglerで本番用ビルドをデプロイ         |

## 金利データ

本番環境の最新金利はCloudflare KV bindingの `RATES_KV` から読み込みます。GitHub Actionsが
毎日午前10時（JST）に価格.comを取得・検証し、`rates:latest` と日付別の
`rates:snapshot:YYYY-MM-DD` を書き込みます。[`data/rates.json`](data/rates.json) はローカル開発、
初回デプロイ、KVが一時的に利用できない場合のフォールバックです。

各カテゴリーに金利順の有効なプランが10件あり、3つの価格.comページの基準日が一致した場合だけ
KVを更新します。既存データと一致するプランは中国語訳を引き継ぎ、新規プランは翻訳されるまで
日本語を表示します。

同じワークフローで三菱UFJ、三井住友、みずほ、りそな、三井住友信託の直近12か月の変動金利下限を
取得し、KVの `rates:trends:v1` とマージします。各行につき最大60か月を保持し、
[`data/trends.json`](data/trends.json) はフォールバックとして使います。現在は直近1年を表示し、
銀行別履歴が十分に蓄積された時点で3年・5年表示を有効にできます。

## デプロイ

`main` へのpushは [GitHub Actions](.github/workflows/deploy.yml) を通じて自動的にデプロイされます。
ワークフローはBunで依存関係をインストールし、テストとOxcチェックを実行してサイトをビルドした後、
Wranglerで `lending-rate` Workerをデプロイします。

[金利更新ワークフロー](.github/workflows/refresh-rates.yml) は毎日午前10時（JST）に実行され、
手動実行にも対応します。初回デプロイ時にWranglerが `RATES_KV` namespaceを自動作成し、
Workerへbindingします。

ワークフローを実行する前に、リポジトリへ次のsecretsを設定してください。

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Cloudflareの設定は [`wrangler.jsonc`](wrangler.jsonc) にあります。

## 免責事項

金利情報は[価格.com住宅ローン比較](https://kakaku.com/housing-loan/)をもとに整理しています。掲載値は
最低金利または特定条件を満たした場合の参考金利であることがあります。実際の適用金利は、審査結果、
借入比率、保険、手数料、地域などの条件によって異なります。

本プロジェクトは情報提供のみを目的としており、金融アドバイスではありません。申し込み前に、
すべての条件を金融機関へ確認してください。
