# SEO Eラーニング

SEO（検索エンジン最適化）を基礎からAI検索時代の実践まで体系的に学ぶ、全19章のEラーニングコンテンツ。

## 構成

- **基礎編**（第1〜7章）: SEOの基本概念、検索エンジンの仕組み、キーワード戦略、ライティング、テクニカルSEO、E-E-A-T
- **実践編**（第8〜13章）: GA4、Search Console、KPI分析、改善実践
- **AI時代編**（第14〜19章）: AI Overview/AI Mode、LLMO、エンティティSEO、構造化データ、ブランドSEO

各章は「この章で学べること」「本文解説」「確認テスト（4択・80%合格基準）」の3構成。

## 技術構成

- 静的サイト（HTML / CSS / Vanilla JS、ビルド不要）
- `assets/css/style.css`: 共通スタイル（強調表現・図解・確認テストUIなど）
- `assets/js/quiz.js`: 確認テストの採点ロジック（localStorageに結果保存）
- `assets/js/progress.js`: コース全体の進捗表示
- `data/curriculum.json`: 全19章のカリキュラム定義

## ローカルでの閲覧方法

`index.html` をブラウザで直接開くか、ローカルサーバーを起動してください。

```
npx serve .
```

## 開発状況

- [x] 第1章「SEO概要」サンプル作成
- [ ] 第2〜19章 作成中
