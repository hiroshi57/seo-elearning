# SEO Eラーニング

SEO（検索エンジン最適化）を基礎からAI検索時代の実践まで体系的に学ぶ、全19章のEラーニングコンテンツ。

## 構成

- **基礎編**（第1〜7章）: SEOの基本概念、検索エンジンの仕組み、キーワード戦略、ライティング、テクニカルSEO、E-E-A-T
- **実践編**（第8〜13章）: GA4、Search Console、KPI分析、改善実践
- **AI時代編**（第14〜19章）: AI Overview/AI Mode、LLMO、エンティティSEO、構造化データ、ブランドSEO

各章は「フェーズトップ（Moduleタイムライン）」→「章内ステップウィザード（学ぶこと→本文セクション→まとめ）」→「確認テスト（5問・80%合格基準）」→「採点結果ページ」の構成。

## 技術構成

- 静的サイト（HTML / CSS / Vanilla JS、ビルド不要で閲覧可）
- `data/curriculum.json`: 全19章・3フェーズのカリキュラム定義
- `data/chapters/*.json`: 各章のコンテンツ本体（goals/sections/summary/quiz）。編集の単一ソース
- `scripts/build.js`: `data/`のJSONから`phases/`・`chapters/`配下のHTMLを自動生成するビルドスクリプト（`node scripts/build.js`で再生成）
- `assets/css/style.css`: 共通スタイル（グラデーションCTA・タイムライン・ウィザード進捗バー・採点結果画面など）
- `assets/js/quiz.js`: 確認テスト回答画面のロジック（回答収集、sessionStorageへの一時保存）
- `assets/js/result.js`: 採点結果ページのロジック（採点・正誤解説・localStorageへの進捗保存）
- `assets/js/progress.js`: コース全体の進捗表示

コンテンツを修正する場合は `data/chapters/*.json` を編集し、`node scripts/build.js` で全HTMLを再生成する。HTMLを直接編集しない。

## ローカルでの閲覧方法

```bash
npx serve .
```

## デプロイ

GitHub（Private）→ Vercel（Public URL: https://seo-elearning.vercel.app）。
コンテンツ更新後は `node scripts/build.js` → `git add -A && git commit` → `git push` → `npx vercel --prod --yes` の順で反映する。

## 開発状況

- [x] 全19章のコンテンツ作成・ビルド・デプロイ完了
- [x] 1. README.mdの更新
- [ ] 2. 添付予定のPDF書籍の内容を該当章に反映（PDF未着のため保留中）
- [x] 3. 全19章を通しての最終レビュー（内容の一貫性・レベル感統一・誤字脱字）
- [x] 4. ビジュアル面の追加（第4章・第17章にフロー図パターンを実装。他章への展開は今後）
- [x] 5. 確認テストのブラウザ実機動作確認（jsdomで全19章・全問正解/1問不正解/未回答ガードの3パターンを検証）
  - **発見・修正済みの重大バグ**: quiz.js内で採点ボタンをroot.querySelectorで取得していたため、
    build.jsが生成するHTML構造（ボタンがrootの外側にある）と噛み合わず、全19章で「採点する」
    ボタンが常に無効化されたままだった。document.querySelectorに修正し、本番反映済み（コミット d726037）。
