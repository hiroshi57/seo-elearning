/* ==========================================================================
   確認テストの選択肢順を並べ替え、正解位置の偏り（多くがB）を解消する。
   - 単一選択: 正解位置を A/B/C/D... に循環で均等割り当て（決定論的）
   - 複数選択: 設問idをシードにした決定論的シャッフル
   解説文は選択肢記号を参照していないため（確認済み）、並べ替えても内容は不変。
   実行: node scripts/quiz-shuffle-answers.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const CH_DIR = path.join(__dirname, "..", "data", "chapters");

function writeJson(file, obj) {
  let out = JSON.stringify(obj, null, 2) + "\n";
  out = out.replace(
    /("correct":\s*)\[\s*([\d,\s]*?)\s*\]/g,
    (m, k, nums) => k + "[" + nums.replace(/\s+/g, "").split(",").filter((s) => s !== "").join(", ") + "]"
  );
  fs.writeFileSync(file, out, "utf8");
}

// 文字列シードから決定論的な乱数（mulberry32）
function seededRng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function main() {
  const files = fs.readdirSync(CH_DIR).filter((f) => f.endsWith(".json"));
  const chapters = files
    .map((f) => ({ file: path.join(CH_DIR, f), j: JSON.parse(fs.readFileSync(path.join(CH_DIR, f), "utf8")) }))
    .sort((a, b) => a.j.no - b.j.no);

  let singleCounter = 0; // 単一選択の正解位置を循環割り当てするためのグローバルカウンタ
  const dist = {};

  for (const { file, j } of chapters) {
    for (const q of j.quiz || []) {
      const opts = q.options || [];
      const n = opts.length;
      if (n < 2) continue;

      if (q.type === "multi") {
        // idシードで決定論的にシャッフル
        const rng = seededRng("m:" + q.id + ":" + n);
        const order = opts.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
          const k = Math.floor(rng() * (i + 1));
          [order[i], order[k]] = [order[k], order[i]];
        }
        q.options = order.map((i) => opts[i]);
        const remap = new Map(order.map((oldIdx, newIdx) => [oldIdx, newIdx]));
        q.correct = (q.correct || []).map((c) => remap.get(c)).sort((a, b) => a - b);
      } else {
        // 単一選択: 正解を目標位置へ移動（0,1,2,3,...を循環）
        const correctIdx = (q.correct && q.correct[0] != null) ? q.correct[0] : 0;
        const target = singleCounter % n;
        singleCounter++;
        const correctOpt = opts[correctIdx];
        const rest = opts.filter((_, i) => i !== correctIdx);
        const newOpts = [];
        let ri = 0;
        for (let i = 0; i < n; i++) newOpts.push(i === target ? correctOpt : rest[ri++]);
        q.options = newOpts;
        q.correct = [target];
        dist[target] = (dist[target] || 0) + 1;
      }
    }
    writeJson(file, j);
  }
  console.log("単一選択の正解位置分布 A/B/C/D:", dist[0] || 0, dist[1] || 0, dist[2] || 0, dist[3] || 0);
  console.log("完了: 全章の選択肢順を再配置しました。");
}
main();
