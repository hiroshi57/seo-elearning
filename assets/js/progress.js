/* ==========================================================================
   コース全体の進捗表示（トップページ／ヘッダー共通）
   quiz.js が保存した localStorage の結果を読み取って可視化する。
   ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "seo_elearning_progress";
  const TOTAL_CHAPTERS = 19;

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function renderHeaderBar() {
    const fillEl = document.querySelector("[data-course-progress-fill]");
    const labelEl = document.querySelector("[data-course-progress-label]");
    if (!fillEl && !labelEl) return;

    const progress = loadProgress();
    const passedCount = Object.values(progress).filter((p) => p.passed).length;
    const ratio = Math.min(passedCount / TOTAL_CHAPTERS, 1);

    if (fillEl) fillEl.style.width = (ratio * 100) + "%";
    if (labelEl) labelEl.textContent = `${passedCount} / ${TOTAL_CHAPTERS} 章 合格済み`;
  }

  function renderChapterCards() {
    const cards = document.querySelectorAll("[data-chapter-card]");
    if (!cards.length) return;

    const progress = loadProgress();
    cards.forEach((card) => {
      const slug = card.dataset.chapterCard;
      const result = progress[slug];
      if (result && result.passed) {
        const badge = document.createElement("span");
        badge.className = "chapter-card__done";
        badge.textContent = "合格 " + result.score + "点";
        card.appendChild(badge);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderHeaderBar();
    renderChapterCards();
  });
})();
