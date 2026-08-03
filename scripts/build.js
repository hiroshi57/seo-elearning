#!/usr/bin/env node
/* ==========================================================================
   ビルドスクリプト
   data/curriculum.json + data/chapters/*.json を読み込み、
   以下のHTMLを生成する。

     phases/{phaseId}/index.html        … フェーズトップ（Moduleタイムライン）
     chapters/{slug}/step-{n}.html      … 学ぶこと → 本文 → まとめ（ウィザード）
     chapters/{slug}/quiz.html          … 確認テスト回答ページ
     chapters/{slug}/result.html        … 採点結果ページ（表示はJS側でlocalStorageから描画）

   本文・設問テキストはJSONを単一のソースオブトゥルースとし、
   HTML側に手書きで複製しない（DOMとJSONの二重管理を避けるための設計）。
   ========================================================================== */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CHAPTERS_DATA_DIR = path.join(DATA_DIR, "chapters");

const curriculum = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "curriculum.json"), "utf8"));

function loadChapterData(slug) {
  const file = path.join(CHAPTERS_DATA_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** quiz[].sectionIndex が sections 配列の範囲内かを検証する。
 *  範囲外（負値・sections.length以上）は「関連する教材を見直す」リンクが
 *  誤ったステップを指してしまうため、ビルド時に警告して早期に気づけるようにする。 */
function validateChapterData(slug, chData) {
  chData.quiz.forEach((q) => {
    if (typeof q.sectionIndex !== "number") return;
    if (q.sectionIndex < 0 || q.sectionIndex >= chData.sections.length) {
      console.warn(
        `[警告] ${slug}: 設問 "${q.id}" の sectionIndex=${q.sectionIndex} が sections の範囲外です（sections数=${chData.sections.length}）。`
      );
    }
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

/** <script>タグ内にJSONを埋め込む際、"</script>"という文字列が
 *  紛れ込んでも script ブロックが途中で閉じられないようにする。 */
function safeJsonForScript(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

/* -------------------------------------------------------------------------
   共通レイアウト
   ------------------------------------------------------------------------- */

function pageShell({ title, assetDepth, bodyClass, headerBack, bodyContent, extraScripts, siteTitle, navHtml }) {
  const prefix = "../".repeat(assetDepth);
  const nav =
    navHtml !== undefined
      ? navHtml
      : `      <a href="${prefix}index.html">コース一覧</a>
      <a href="${prefix}tests/index.html">確認テスト</a>`;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${prefix}assets/css/style.css">
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
<header class="site-header">
  <div class="site-header__inner">
    <a href="${prefix}index.html" class="site-header__title">${escapeHtml(siteTitle || "📘 SEO Eラーニング")}</a>
    <nav class="site-header__nav">
${nav}
    </nav>
  </div>
</header>
<div class="course-progress">
  <div class="course-progress__bar"><div class="course-progress__fill" data-course-progress-fill></div></div>
  <div class="course-progress__label" data-course-progress-label>0 / 19 章 合格済み</div>
</div>

<main>
${headerBack || ""}
${bodyContent}
</main>

<script src="${prefix}assets/js/progress.js"></script>
${extraScripts || ""}
</body>
</html>
`;
}

/* -------------------------------------------------------------------------
   フェーズトップ： Moduleタイムライン
   ------------------------------------------------------------------------- */

function buildPhasePage(phase) {
  const chapterList = phase.chapters
    .map((no) => curriculum.chapters.find((c) => c.no === no))
    .filter(Boolean);

  const items = chapterList
    .map((ch, idx) => {
      const chData = loadChapterData(ch.slug);
      const topicsLabel = chData ? chData.topicsLabel : (ch.sections || []).join("、");
      const estimate = chData ? chData.estimateMinutes : 10;
      const quizCount = chData ? chData.quiz.length : 0;
      return `
    <div class="module-item" data-chapter-card="${ch.slug}">
      <div class="module-item__marker">${idx + 1}</div>
      <a href="../../chapters/${ch.slug}/step-1.html" class="module-item__card">
        <div class="module-item__badges">
          <span class="module-badge module-badge--test">📋 TEST</span>
        </div>
        <div class="module-item__title">第${ch.no}章　${escapeHtml(ch.title)}</div>
        <div class="module-item__topics">${escapeHtml(topicsLabel)}</div>
        <div class="module-item__footer">
          <span>🕒 学習目安 約${estimate}分</span>
          <span class="module-item__meta-right">${quizCount}問　<span class="module-item__arrow">→</span></span>
        </div>
      </a>
    </div>`;
    })
    .join("\n");

  const body = `
  <div class="phase-hero">
    <div class="phase-hero__icon">${phase.icon || "📘"}</div>
    <div>
      <div class="phase-hero__title">${escapeHtml(phase.title)} <small>${escapeHtml(phase.subtitle || "")}</small></div>
      <p class="phase-hero__desc">${escapeHtml(phase.description || "")}</p>
      <div class="phase-hero__meta">
        <span>${chapterList.length} Modules</span>
        <span>🕒 学習目安 約${chapterList.reduce((sum, ch) => {
          const d = loadChapterData(ch.slug);
          return sum + (d ? d.estimateMinutes : 10);
        }, 0)}分</span>
        <span>合格基準：各Module 80%以上</span>
      </div>
    </div>
  </div>

  <div class="module-timeline">
${items}
  </div>
`;

  const headerBack = `  <a href="../../index.html" class="breadcrumb-back">← コース一覧</a>`;

  return pageShell({
    title: `${phase.title} | SEO Eラーニング`,
    assetDepth: 2,
    headerBack,
    bodyContent: body
  });
}

/* -------------------------------------------------------------------------
   ステップウィザード（学ぶこと → 本文 → まとめ）
   ------------------------------------------------------------------------- */

function buildStepPages(chapter, chData) {
  const totalSteps = 1 + chData.sections.length + 1; // 学ぶこと + 本文 + まとめ
  const pages = [];

  // Step 1: この章で学ぶこと
  pages.push({
    stepNo: 1,
    heading: "この章で学ぶこと",
    contentHtml: `<ul class="goals-list">
${chData.goals.map((g) => `      <li>${escapeHtml(g)}</li>`).join("\n")}
    </ul>`
  });

  // Step 2..N-1: 本文セクション
  chData.sections.forEach((sec, idx) => {
    pages.push({
      stepNo: 2 + idx,
      heading: sec.heading,
      contentHtml: sec.bodyHtml
    });
  });

  // 最終Step: まとめ
  pages.push({
    stepNo: totalSteps,
    heading: "まとめ",
    contentHtml: `<ul class="goals-list">
${chData.summary.map((s) => `      <li>${escapeHtml(s)}</li>`).join("\n")}
    </ul>`
  });

  pages.forEach((page) => {
    const isFirst = page.stepNo === 1;
    const isLast = page.stepNo === totalSteps;
    const prevHref = isFirst ? null : `step-${page.stepNo - 1}.html`;
    const nextHref = isLast ? "quiz.html" : `step-${page.stepNo + 1}.html`;
    const nextLabel = isLast ? "📋 確認テストへ進む" : "次へ →";

    const progressSegs = Array.from({ length: totalSteps })
      .map((_, i) => {
        const segIdx = i + 1;
        const cls = segIdx === page.stepNo ? "is-active" : segIdx < page.stepNo ? "is-done" : "";
        return `<div class="wizard-progress__seg ${cls}"></div>`;
      })
      .join("");

    const body = `
  <div class="wizard-header">
    <span class="time-badge">🕒 学習目安 約${chData.estimateMinutes}分</span>
    <h1 class="wizard-header__title">${escapeHtml(chData.title)}</h1>
    <p class="wizard-header__topics">${escapeHtml(chData.topicsLabel)}</p>
    <div class="wizard-progress">
      <div class="wizard-progress__track">${progressSegs}</div>
      <div class="wizard-progress__count">${page.stepNo} / ${totalSteps}</div>
    </div>
  </div>

  <section class="section-card">
    <h2>${escapeHtml(page.heading)}</h2>
    ${page.contentHtml}
  </section>

  <div class="wizard-footer">
    ${prevHref ? `<a href="${prevHref}" class="btn btn--ghost">← 前へ</a>` : `<a href="../../phases/${chapter.phase}/index.html" class="btn btn--ghost">← 一覧へ</a>`}
    <div class="wizard-footer__spacer"></div>
    <a href="${nextHref}" class="btn btn--primary">${nextLabel}</a>
  </div>
`;

    const headerBack = `  <a href="../../phases/${chapter.phase}/index.html" class="breadcrumb-back">← ${escapeHtml(chData.title)}</a>`;

    const html = pageShell({
      title: `${chData.title}（${page.heading}） | SEO Eラーニング`,
      assetDepth: 2,
      headerBack,
      bodyContent: body
    });

    writeFile(path.join(ROOT, "chapters", chapter.slug, `step-${page.stepNo}.html`), html);
  });

  return totalSteps;
}

/* -------------------------------------------------------------------------
   確認テスト回答ページ
   ------------------------------------------------------------------------- */

function buildQuizPage(chapter, chData, opts = {}) {
  const outRoot = opts.outRoot || ROOT;
  const testsOnly = !!opts.testsOnly;
  const questionsJson = safeJsonForScript(chData.quiz);

  const itemsHtml = chData.quiz
    .map((q, qi) => {
      const isMulti = q.type === "multi";
      const typeLabel = isMulti ? "複数選択（すべて選択）" : "単一選択";
      const typeClass = isMulti ? "quiz-item__type quiz-item__type--multi" : "quiz-item__type";
      const questionId = `${q.id}-question`;
      const marks = ["A", "B", "C", "D", "E", "F"];

      const optionsHtml = q.options
        .map(
          (opt, oi) => `      <div class="quiz-option" data-quiz-option="${oi}"><span class="quiz-option__mark">${marks[oi]}</span><span>${escapeHtml(opt)}</span></div>`
        )
        .join("\n");

      return `    <div data-quiz-item="${q.id}" class="quiz-item is-unanswered">
      <div class="quiz-item__head">
        <span class="quiz-item__no">Q${qi + 1} / ${chData.quiz.length}</span>
        <div class="quiz-item__badges">
          <span class="quiz-item__unanswered" data-quiz-unanswered>⚠ 未回答</span>
          <span class="${typeClass}">${typeLabel}</span>
        </div>
      </div>
      <div class="quiz-item__question" id="${questionId}">${escapeHtml(q.question)}</div>
      <div class="quiz-options" role="${isMulti ? "group" : "radiogroup"}" aria-labelledby="${questionId}">
${optionsHtml}
      </div>
    </div>`;
    })
    .join("\n\n");

  const body = `
  <div class="wizard-header">
    <span class="time-badge">📋 確認テスト</span>
    <h1 class="wizard-header__title">${escapeHtml(chData.title)}</h1>
    <p class="wizard-header__topics">${escapeHtml(chData.topicsLabel)}</p>
  </div>

  <section class="section-card" data-quiz-root data-chapter="${chapter.slug}" data-total-steps="${chData.sections.length + 2}">
    <div class="quiz-intro"><span class="quiz-intro__icon">📋</span>確認テスト</div>
    <p class="quiz-sub">全${chData.quiz.length}問。すべて回答して「採点する」を押してください。</p>
    <p class="quiz-pass"><span class="quiz-pass__icon">🎯</span>合格基準：正答率 <strong>80%</strong> 以上</p>

    <script type="application/json" data-quiz-data>
${questionsJson}
    </script>

${itemsHtml}

  </section>

  <div class="wizard-footer">
    ${testsOnly
      ? `<a href="../../index.html" class="btn btn--ghost">← テスト一覧</a>`
      : `<a href="step-${chData.sections.length + 2}.html" class="btn btn--ghost">← 教材に戻る</a>`}
    <div class="wizard-footer__spacer"></div>
    <div class="quiz-unanswered-note" data-quiz-unanswered-note></div>
    <button class="btn btn--primary" data-quiz-grade disabled>📋 採点する</button>
  </div>
`;

  const headerBack = testsOnly
    ? `  <a href="../../index.html" class="breadcrumb-back">← テスト一覧</a>`
    : `  <a href="../../phases/${chapter.phase}/index.html" class="breadcrumb-back">← ${escapeHtml(chData.title)}</a>`;

  const html = pageShell({
    title: `${chData.title}（確認テスト） | ${testsOnly ? "SEO確認テスト" : "SEO Eラーニング"}`,
    assetDepth: 2,
    headerBack,
    bodyContent: body,
    extraScripts: `<script src="../../assets/js/quiz.js"></script>`,
    siteTitle: testsOnly ? "📋 SEO 確認テスト" : undefined,
    navHtml: testsOnly ? `      <a href="../../index.html">テスト一覧</a>` : undefined
  });

  writeFile(path.join(outRoot, "chapters", chapter.slug, "quiz.html"), html);
}

/* -------------------------------------------------------------------------
   採点結果ページ（表示内容はJS側でlocalStorageの直近結果から動的に組み立てる）
   ------------------------------------------------------------------------- */

function buildResultPage(chapter, chData, opts = {}) {
  const outRoot = opts.outRoot || ROOT;
  const testsOnly = !!opts.testsOnly;
  const totalSteps = chData.sections.length + 2;

  const body = `
  <div class="wizard-header">
    <span class="time-badge">🕒 学習目安 約${chData.estimateMinutes}分</span>
    <h1 class="wizard-header__title">${escapeHtml(chData.title)}</h1>
    <p class="wizard-header__topics">${escapeHtml(chData.topicsLabel)}</p>
  </div>

  <div class="result-summary" data-result-summary>
    <div class="result-summary__icon" data-result-icon>🏆</div>
    <div class="result-summary__title">確認テスト結果</div>
    <div class="result-summary__score" data-result-score>--%</div>
    <div class="result-summary__sub" data-result-sub></div>
    <div class="result-status" data-result-status></div>
  </div>

  <div class="result-review">
    <div class="result-review__head">
      <div class="result-review__title">回答一覧と解説</div>
      <div class="result-review__hint">間違えた問題は「関連する教材を見直す」から該当ページを確認できます</div>
    </div>
    <div data-result-list></div>
  </div>

  <div class="result-actions">
    <button class="btn btn--primary" data-result-retry>↻ テストを再受験</button>
    ${testsOnly ? "" : `<a href="step-1.html" class="btn btn--ghost">📖 教材から見直す</a>\n    `}<a href="${testsOnly ? "../../index.html" : `../../phases/${chapter.phase}/index.html`}" class="btn btn--muted">一覧に戻る</a>
  </div>

  <script type="application/json" data-quiz-data>
${safeJsonForScript(chData.quiz)}
  </script>
`;

  const headerBack = testsOnly
    ? `  <a href="../../index.html" class="breadcrumb-back">← テスト一覧</a>`
    : `  <a href="../../phases/${chapter.phase}/index.html" class="breadcrumb-back">← ${escapeHtml(chData.title)}</a>`;

  const html = pageShell({
    title: `${chData.title}（採点結果） | ${testsOnly ? "SEO確認テスト" : "SEO Eラーニング"}`,
    assetDepth: 2,
    headerBack,
    bodyContent: body,
    extraScripts: `<script>window.__SEO_ELEARNING_TOTAL_STEPS__ = ${totalSteps};</script>\n<script src="../../assets/js/result.js"></script>`,
    siteTitle: testsOnly ? "📋 SEO 確認テスト" : undefined,
    navHtml: testsOnly ? `      <a href="../../index.html">テスト一覧</a>` : undefined
  });

  writeFile(path.join(outRoot, "chapters", chapter.slug, "result.html"), html);
}

/* -------------------------------------------------------------------------
   実行
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   確認テストだけを受けるための一覧ページ（tests/index.html）
   ------------------------------------------------------------------------- */

function buildTestsPage() {
  const phaseBlocks = curriculum.phases
    .map((phase) => {
      const chapterList = phase.chapters
        .map((no) => curriculum.chapters.find((c) => c.no === no))
        .filter(Boolean);
      const cards = chapterList
        .map((ch) => {
          const chData = loadChapterData(ch.slug);
          if (!chData) return "";
          const quizCount = chData.quiz.length;
          return `
        <a href="../chapters/${ch.slug}/quiz.html" class="test-card" data-chapter-card="${ch.slug}">
          <div class="test-card__no">第${ch.no}章</div>
          <div class="test-card__title">${escapeHtml(ch.title)}</div>
          <div class="test-card__meta"><span class="module-badge module-badge--test">📋 ${quizCount}問</span><span class="module-item__arrow">→</span></div>
        </a>`;
        })
        .join("\n");
      return `
    <section class="test-phase">
      <h2 class="test-phase__title">${phase.icon || "📘"} ${escapeHtml(phase.title)} <small>${escapeHtml(phase.subtitle || "")}</small></h2>
      <div class="test-grid">
${cards}
      </div>
    </section>`;
    })
    .join("\n");

  const totalQuiz = curriculum.chapters.reduce((sum, ch) => {
    const d = loadChapterData(ch.slug);
    return sum + (d ? d.quiz.length : 0);
  }, 0);

  const body = `
  <div class="hero-banner">
    <h1>📋 確認テスト</h1>
    <p>レッスンを飛ばして、各章の確認テストだけを受けられます（全${curriculum.chapters.length}章・計${totalQuiz}問）。すべて回答して採点してください。合格基準は正答率80%以上です。</p>
  </div>
${phaseBlocks}
`;
  const headerBack = `  <a href="../index.html" class="breadcrumb-back">← コース一覧</a>`;
  return pageShell({
    title: "確認テスト一覧 | SEO Eラーニング",
    assetDepth: 1,
    headerBack,
    bodyContent: body
  });
}

/* -------------------------------------------------------------------------
   テストだけ版（tests-only/）：単体でVercelにデプロイできるスタンドアロンサイト
   ------------------------------------------------------------------------- */

function buildTestsOnlySite() {
  const OUT = path.join(ROOT, "tests-only");

  // 出力先をクリーンにしてから生成（旧ファイルの残留を防ぐ）
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // CSS / JS のみコピー（テストページは画像を使わないため軽量に保つ）
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  fs.cpSync(path.join(ROOT, "assets", "css"), path.join(OUT, "assets", "css"), { recursive: true });
  fs.cpSync(path.join(ROOT, "assets", "js"), path.join(OUT, "assets", "js"), { recursive: true });

  let count = 0;
  let totalQuiz = 0;

  const phaseBlocks = curriculum.phases
    .map((phase) => {
      const chapterList = phase.chapters
        .map((no) => curriculum.chapters.find((c) => c.no === no))
        .filter(Boolean);
      const cards = chapterList
        .map((ch) => {
          const chData = loadChapterData(ch.slug);
          if (!chData) return "";
          buildQuizPage(ch, chData, { outRoot: OUT, testsOnly: true });
          buildResultPage(ch, chData, { outRoot: OUT, testsOnly: true });
          count += 1;
          totalQuiz += chData.quiz.length;
          return `
        <a href="chapters/${ch.slug}/quiz.html" class="test-card" data-chapter-card="${ch.slug}">
          <div class="test-card__no">第${ch.no}章</div>
          <div class="test-card__title">${escapeHtml(ch.title)}</div>
          <div class="test-card__meta"><span class="module-badge module-badge--test">📋 ${chData.quiz.length}問</span><span class="module-item__arrow">→</span></div>
        </a>`;
        })
        .join("\n");
      return `
    <section class="test-phase">
      <h2 class="test-phase__title">${phase.icon || "📘"} ${escapeHtml(phase.title)} <small>${escapeHtml(phase.subtitle || "")}</small></h2>
      <div class="test-grid">
${cards}
      </div>
    </section>`;
    })
    .join("\n");

  const body = `
  <div class="hero-banner">
    <h1>📋 SEO 確認テスト</h1>
    <p>全${curriculum.chapters.length}章・計${totalQuiz}問。受けたい章を選んでテストを開始してください。すべて回答して採点すると、正誤と解説が表示されます（合格基準：正答率80%以上）。</p>
  </div>
${phaseBlocks}
`;

  const html = pageShell({
    title: "SEO 確認テスト",
    assetDepth: 0,
    bodyContent: body,
    siteTitle: "📋 SEO 確認テスト",
    navHtml: `      <a href="index.html">テスト一覧</a>`
  });
  writeFile(path.join(OUT, "index.html"), html);

  console.log(`テストだけ版: tests-only/ に ${count}章分（計${totalQuiz}問）を生成しました。`);
}

function main() {
  let builtChapters = 0;
  let skippedChapters = [];

  curriculum.phases.forEach((phase) => {
    writeFile(path.join(ROOT, "phases", phase.id, "index.html"), buildPhasePage(phase));
  });

  writeFile(path.join(ROOT, "tests", "index.html"), buildTestsPage());

  curriculum.chapters.forEach((chapter) => {
    const chData = loadChapterData(chapter.slug);
    if (!chData) {
      skippedChapters.push(chapter.slug);
      return;
    }
    validateChapterData(chapter.slug, chData);
    buildStepPages(chapter, chData);
    buildQuizPage(chapter, chData);
    buildResultPage(chapter, chData);
    builtChapters += 1;
  });

  buildTestsOnlySite();

  console.log(`ビルド完了: ${builtChapters}章分のページを生成しました。`);
  console.log(`フェーズトップ: ${curriculum.phases.length}件`);
  if (skippedChapters.length) {
    console.log(`未作成（data/chapters/*.jsonが無い）: ${skippedChapters.join(", ")}`);
  }
}

main();
