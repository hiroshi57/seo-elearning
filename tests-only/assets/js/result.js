/* ==========================================================================
   採点結果ページ ロジック（result.html専用）

   回答データの入手経路は2通り：
   1. quiz.html から直後に遷移してきた場合
      → sessionStorage の一時領域（PENDING_KEY）に置かれた回答を採点する
   2. result.html を再読み込みした場合／ブックマーク等で再訪した場合
      → sessionStorage は消費済みのため、localStorage の永続進捗
        （PROGRESS_KEY）に保存しておいた前回の回答を復元して再採点する

   どちらの経路でも同じ採点ロジックを通すことで、結果表示のたびに
   スコア・合否・設問ごとの正誤/解説/教材へのリンクを再構築する。
   合格基準は80%以上。
   ========================================================================== */

(function () {
  "use strict";

  const PENDING_KEY = "seo_elearning_pending_answers";
  const PROGRESS_KEY = "seo_elearning_progress";
  const PASS_THRESHOLD = 0.8;

  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
      /* localStorage が使えない環境では進捗保存をスキップ */
    }
  }

  function markChapterResult(chapterSlug, scoreRatio, passed, answers) {
    const progress = loadProgress();
    progress[chapterSlug] = {
      score: Math.round(scoreRatio * 100),
      passed: passed,
      answers: answers,
      updatedAt: new Date().toISOString()
    };
    saveProgress(progress);
  }

  function arraysEqualAsSets(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    const sa = [...a].sort((x, y) => x - y);
    const sb = [...b].sort((x, y) => x - y);
    return sa.every((v, i) => v === sb[i]);
  }

  function readPendingAnswers(chapterSlug) {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.chapterSlug !== chapterSlug) return null;
      return parsed.answers;
    } catch (e) {
      return null;
    }
  }

  /** result.html のリロード時など、sessionStorage の一時回答が
   *  既に消費済みの場合に、直近の採点結果（localStorageの永続進捗）
   *  から回答内訳を復元する。 */
  function readPersistedAnswers(chapterSlug) {
    if (!chapterSlug) return null;
    const progress = loadProgress();
    const entry = progress[chapterSlug];
    return entry && entry.answers ? entry.answers : null;
  }

  const marks = ["A", "B", "C", "D", "E", "F"];

  function optionLabel(q, indices) {
    if (!indices || indices.length === 0) return "（未回答）";
    return indices
      .slice()
      .sort((a, b) => a - b)
      .map((i) => `${marks[i]}. ${q.options[i]}`)
      .join(" / ");
  }

  function init() {
    const root = document.querySelector("[data-result-summary]");
    if (!root) return;

    const dataEl = document.querySelector('script[type="application/json"][data-quiz-data]');
    if (!dataEl) return;

    let questions;
    try {
      questions = JSON.parse(dataEl.textContent);
    } catch (e) {
      console.error("quiz-data の解析に失敗しました", e);
      return;
    }

    // URLパスは常に chapters/{slug}/result.html という固定の相対構造で
    // 生成されるため（build.js参照）、末尾から2番目のセグメントが
    // 常に章スラッグに一致する。ホスティング先のディレクトリの深さや
    // ドメインには依存しない。
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const effectiveSlug = pathParts.length >= 2 ? pathParts[pathParts.length - 2] : null;

    const pendingAnswers = readPendingAnswers(effectiveSlug);
    const answers = pendingAnswers || readPersistedAnswers(effectiveSlug);

    const scoreEl = document.querySelector("[data-result-score]");
    const subEl = document.querySelector("[data-result-sub]");
    const statusEl = document.querySelector("[data-result-status]");
    const iconEl = document.querySelector("[data-result-icon]");
    const listEl = document.querySelector("[data-result-list]");
    const retryBtn = document.querySelector("[data-result-retry]");

    if (!answers) {
      if (subEl) subEl.textContent = "回答データが見つかりませんでした。テストを受け直してください。";
      if (scoreEl) scoreEl.textContent = "--%";
      if (retryBtn) retryBtn.addEventListener("click", () => (window.location.href = "quiz.html"));
      return;
    }

    let correctCount = 0;
    const rows = questions.map((q, qi) => {
      const userAns = answers[q.id] || [];
      const isCorrect = arraysEqualAsSets(userAns, q.correct);
      if (isCorrect) correctCount += 1;

      const totalSteps = window.__SEO_ELEARNING_TOTAL_STEPS__ || null;
      const reviewStep = typeof q.sectionIndex === "number" && q.sectionIndex >= 0 ? q.sectionIndex + 2 : null;
      const reviewHref = reviewStep && totalSteps && reviewStep >= 2 && reviewStep <= totalSteps - 1
        ? `step-${reviewStep}.html`
        : null;

      return `
      <div class="result-item ${isCorrect ? "is-right" : "is-wrong"}">
        <div class="result-item__head">
          <span class="result-item__icon">${isCorrect ? "✅" : "❌"}</span>
          <span>Q${qi + 1}. ${escapeHtml(q.question)}</span>
        </div>
        <p class="result-item__answer"><strong>正解:</strong> ${escapeHtml(optionLabel(q, q.correct))}</p>
        ${isCorrect ? "" : `<p class="result-item__answer"><strong>あなたの回答:</strong> ${escapeHtml(optionLabel(q, userAns))}</p>`}
        <p class="result-item__explain">${escapeHtml(q.explain || "")}</p>
        ${!isCorrect && reviewHref ? `<a href="${reviewHref}" class="btn btn--ghost btn--sm">📖 関連する教材を見直す</a>` : ""}
      </div>`;
    });

    const ratio = correctCount / questions.length;
    const passed = ratio >= PASS_THRESHOLD;
    const scorePercent = Math.round(ratio * 100);

    if (scoreEl) scoreEl.textContent = `${scorePercent}%`;
    if (subEl) subEl.textContent = `${correctCount} / ${questions.length} 問正解`;
    if (iconEl) iconEl.textContent = passed ? "🏆" : "📋";

    root.classList.toggle("is-pass", passed);
    root.classList.toggle("is-fail", !passed);

    if (statusEl) {
      statusEl.classList.toggle("is-pass", passed);
      statusEl.classList.toggle("is-fail", !passed);
      statusEl.innerHTML = passed
        ? "✓ 合格（80%以上で合格）"
        : "✕ 不合格（80%以上で合格）";
    }

    if (listEl) listEl.innerHTML = rows.join("\n");

    if (effectiveSlug) markChapterResult(effectiveSlug, ratio, passed, answers);

    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch (e) {
      /* no-op */
    }

    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        window.location.href = "quiz.html";
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
