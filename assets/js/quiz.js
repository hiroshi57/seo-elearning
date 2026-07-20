/* ==========================================================================
   確認テスト 回答画面ロジック（quiz.html専用）
   ここでは正誤判定や採点結果の表示は行わない。
   回答を収集し、localStorageの一時領域に保存したうえで
   同じ章の result.html に遷移する。採点・表示ロジックは result.js が担う。
   ========================================================================== */

(function () {
  "use strict";

  const PENDING_KEY = "seo_elearning_pending_answers";

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
    const unansweredNote = root.querySelector("[data-quiz-unanswered-note]");

    function updateUnansweredBadge(q, itemEl) {
      const answered = answers[q.id] && answers[q.id].length > 0;
      itemEl.classList.toggle("is-unanswered", !answered);
    }

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

          updateUnansweredBadge(q, itemEl);
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

    function unansweredCount() {
      return questions.filter((q) => !answers[q.id] || answers[q.id].length === 0).length;
    }

    function allAnswered() {
      return unansweredCount() === 0;
    }

    function updateGradeButtonState() {
      const remaining = unansweredCount();
      if (gradeBtn) gradeBtn.disabled = remaining > 0;
      if (unansweredNote) {
        unansweredNote.textContent = remaining > 0 ? `あと${remaining}問、未回答の設問があります` : "";
      }
    }

    function submit() {
      if (!allAnswered()) return;

      try {
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({ chapterSlug: chapterSlug, answers: answers, submittedAt: new Date().toISOString() })
        );
      } catch (e) {
        console.error("回答の一時保存に失敗しました", e);
      }

      window.location.href = "result.html";
    }

    if (gradeBtn) {
      gradeBtn.addEventListener("click", submit);
    }
    updateGradeButtonState();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const quizRoot = document.querySelector("[data-quiz-root]");
    if (quizRoot) initQuiz(quizRoot);
  });
})();
