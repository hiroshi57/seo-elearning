/* ==========================================================================
   確認テスト 採点ロジック
   各章HTMLは <script type="application/json" data-quiz-data> に
   設問データを埋め込み、data-chapter 属性で章スラッグを渡す。
   合格基準は「全問正解」。採点結果は localStorage に保存し、
   トップページの進捗表示に利用する。
   ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "seo_elearning_progress";

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      /* localStorage が使えない環境では進捗保存をスキップ */
    }
  }

  function markChapterResult(chapterSlug, scoreRatio, passed) {
    const progress = loadProgress();
    progress[chapterSlug] = {
      score: Math.round(scoreRatio * 100),
      passed: passed,
      updatedAt: new Date().toISOString()
    };
    saveProgress(progress);
  }

  function initQuiz(root) {
    const chapterSlug = root.dataset.chapter;
    const dataEl = root.querySelector('script[type="application/json"][data-quiz-data]');
    if (!dataEl) return;

    let questions;
    try {
      questions = JSON.parse(dataEl.textContent);
    } catch (e) {
      console.error("quiz-data の解析に失敗しました", e);
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error("quiz-data に設問がありません");
      return;
    }

    const answers = {}; // { questionId: [selectedIndices] }
    const gradeBtn = root.querySelector("[data-quiz-grade]");
    const retryBtn = root.querySelector("[data-quiz-retry]");
    const resultPanel = root.querySelector("[data-quiz-result]");

    questions.forEach((q) => {
      answers[q.id] = [];
      const itemEl = root.querySelector(`[data-quiz-item="${q.id}"]`);
      if (!itemEl) return;

      const isMulti = q.type === "multi";
      const optionEls = itemEl.querySelectorAll("[data-quiz-option]");

      optionEls.forEach((optEl) => {
        optEl.setAttribute("role", isMulti ? "checkbox" : "radio");
        optEl.setAttribute("aria-checked", "false");
        optEl.setAttribute("tabindex", "0");

        const select = () => {
          if (itemEl.classList.contains("is-graded")) return;

          const optIndex = Number(optEl.dataset.quizOption);

          if (isMulti) {
            const pos = answers[q.id].indexOf(optIndex);
            if (pos >= 0) {
              answers[q.id].splice(pos, 1);
              optEl.classList.remove("is-selected");
              optEl.setAttribute("aria-checked", "false");
            } else {
              answers[q.id].push(optIndex);
              optEl.classList.add("is-selected");
              optEl.setAttribute("aria-checked", "true");
            }
          } else {
            answers[q.id] = [optIndex];
            optionEls.forEach((el) => {
              el.classList.remove("is-selected");
              el.setAttribute("aria-checked", "false");
            });
            optEl.classList.add("is-selected");
            optEl.setAttribute("aria-checked", "true");
          }

          updateGradeButtonState();
        };

        optEl.addEventListener("click", select);
        optEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            select();
          }
        });
      });
    });

    function allAnswered() {
      return questions.every((q) => answers[q.id] && answers[q.id].length > 0);
    }

    function updateGradeButtonState() {
      if (gradeBtn) gradeBtn.disabled = !allAnswered();
    }

    function arraysEqualAsSets(a, b) {
      if (a.length !== b.length) return false;
      const sa = [...a].sort((x, y) => x - y);
      const sb = [...b].sort((x, y) => x - y);
      return sa.every((v, i) => v === sb[i]);
    }

    function grade() {
      if (!allAnswered()) return;

      let correctCount = 0;

      questions.forEach((q) => {
        const itemEl = root.querySelector(`[data-quiz-item="${q.id}"]`);
        if (!itemEl) return;

        const userAns = answers[q.id] || [];
        const correct = arraysEqualAsSets(userAns, q.correct);
        if (correct) correctCount += 1;

        itemEl.classList.add("is-graded");
        itemEl.classList.toggle("is-correct", correct);
        itemEl.classList.toggle("is-incorrect", !correct);

        const optionEls = itemEl.querySelectorAll("[data-quiz-option]");
        optionEls.forEach((optEl) => {
          const optIndex = Number(optEl.dataset.quizOption);
          if (q.correct.includes(optIndex)) {
            optEl.classList.add("is-answer-correct");
          }
        });

        const explainLabel = itemEl.querySelector("[data-quiz-explain-label]");
        if (explainLabel) {
          explainLabel.textContent = correct ? "正解" : "不正解";
        }
      });

      const ratio = correctCount / questions.length;
      const passed = correctCount === questions.length;

      if (resultPanel) {
        resultPanel.classList.add("is-visible");
        resultPanel.classList.toggle("is-pass", passed);
        resultPanel.classList.toggle("is-fail", !passed);

        const scoreEl = resultPanel.querySelector("[data-quiz-score]");
        const msgEl = resultPanel.querySelector("[data-quiz-message]");
        const subEl = resultPanel.querySelector("[data-quiz-sub]");

        if (scoreEl) scoreEl.textContent = Math.round(ratio * 100) + "点";
        if (msgEl) msgEl.textContent = passed ? "合格です！お疲れさまでした" : "全問正解で合格です。もう一度挑戦しましょう";
        if (subEl) subEl.textContent = `${correctCount} / ${questions.length} 問正解`;
      }

      if (chapterSlug) markChapterResult(chapterSlug, ratio, passed);

      if (gradeBtn) gradeBtn.style.display = "none";
      if (retryBtn) retryBtn.style.display = "inline-flex";

      resultPanel && resultPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function retry() {
      questions.forEach((q) => {
        answers[q.id] = [];
        const itemEl = root.querySelector(`[data-quiz-item="${q.id}"]`);
        if (!itemEl) return;
        itemEl.classList.remove("is-graded", "is-correct", "is-incorrect");
        itemEl.querySelectorAll("[data-quiz-option]").forEach((optEl) => {
          optEl.classList.remove("is-selected", "is-answer-correct");
          optEl.setAttribute("aria-checked", "false");
        });
      });

      if (resultPanel) resultPanel.classList.remove("is-visible", "is-pass", "is-fail");
      if (gradeBtn) { gradeBtn.style.display = "inline-flex"; gradeBtn.disabled = true; }
      if (retryBtn) retryBtn.style.display = "none";

      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (gradeBtn) {
      gradeBtn.disabled = true;
      gradeBtn.addEventListener("click", grade);
    }
    if (retryBtn) {
      retryBtn.style.display = "none";
      retryBtn.addEventListener("click", retry);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const quizRoot = document.querySelector("[data-quiz-root]");
    if (quizRoot) initQuiz(quizRoot);
  });

  window.SeoElearning = window.SeoElearning || {};
  window.SeoElearning.loadProgress = loadProgress;
})();
