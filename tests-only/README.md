# SEO 確認テスト（テストだけ版）

レッスン（教材ページ）を含まず、**確認テストだけ**を受けられるスタンドアロンサイトです。
全20章・計182問。合格基準は正答率80%以上。

- このフォルダは `node scripts/build.js` で自動生成されます（**直接編集しないでください**）。
- 問題文を修正する場合は `data/chapters/*.json` を編集し、再ビルドしてください。

## 構成

```
tests-only/
├── index.html                 テスト一覧（トップ）
├── assets/css, assets/js      本体サイトと同じCSS/JS（画像は不要なため含まない）
└── chapters/<slug>/
    ├── quiz.html              各章の確認テスト
    └── result.html            採点結果・解説
```

## Vercel へのデプロイ（本体サイトとは別プロジェクトとして公開する場合）

Vercel ダッシュボードで新規プロジェクトを作成し、GitHub リポジトリ
`hiroshi57/seo-elearning` を Import して、次のように設定します。

| 設定項目 | 値 |
|---|---|
| Framework Preset | **Other** |
| **Root Directory** | **`tests-only`** ← これが最重要 |
| Build Command | 空（オフ） |
| Output Directory | 空（オフ） |
| Install Command | 空（オフ） |

Root Directory に `tests-only` を指定することで、このフォルダだけが独立した
サイトとして公開されます（本体の教材サイトは別プロジェクトのまま維持されます）。

CLI から公開する場合は、このフォルダを直接デプロイします。

```bash
cd tests-only
npx vercel --prod --yes
```
