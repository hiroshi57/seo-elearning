/* ==========================================================================
   章ごとの Markdown エクスポート
   data/chapters/*.json の内容を docs/chapters/NN-slug.md に変換する。
   実行: node scripts/export-markdown.js
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CH_DIR = path.join(ROOT, "data", "chapters");
const OUT_DIR = path.join(ROOT, "docs", "chapters");

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

// インライン要素を Markdown 化し、残タグを除去（1行テキスト用）
function inline(s) {
  return decodeEntities(
    String(s)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**")
      .replace(/<mark>([\s\S]*?)<\/mark>/gi, "**$1**")
      .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
      .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// ブロック中に残ったインラインタグを変換（改行は保持）
function inlineBlock(s) {
  return decodeEntities(
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**")
      .replace(/<mark>([\s\S]*?)<\/mark>/gi, "**$1**")
      .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
      .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
      .replace(/<[^>]+>/g, "")
  );
}

function tableToMd(tableHtml) {
  const cell = (tr) =>
    [...tr.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
      inline(m[1]).replace(/\n+/g, "<br>").replace(/\|/g, "\\|")
    );
  const headM = tableHtml.match(/<thead>([\s\S]*?)<\/thead>/i);
  const bodyM = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  let heads = [];
  if (headM) {
    const tr = headM[1].match(/<tr>([\s\S]*?)<\/tr>/i);
    if (tr) heads = cell(tr[1]);
  }
  const rows = [];
  const bodySrc = bodyM ? bodyM[1] : tableHtml;
  for (const tr of bodySrc.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) rows.push(cell(tr[1]));
  if (!heads.length && rows.length) heads = rows.shift();
  const cols = heads.length || (rows[0] ? rows[0].length : 0);
  if (!cols) return "";
  while (heads.length < cols) heads.push("");
  let md = "\n| " + heads.join(" | ") + " |\n| " + heads.map(() => "---").join(" | ") + " |\n";
  for (const r of rows) {
    while (r.length < cols) r.push("");
    md += "| " + r.join(" | ") + " |\n";
  }
  return md + "\n";
}

function bodyToMd(html) {
  let s = html;

  // コードブロックは後段のタグ除去で壊れないよう退避し、最後に復元する
  const codeBlocks = [];
  const stash = (label, rawCode) => {
    const text = decodeEntities(rawCode.replace(/<[^>]+>/g, "")).replace(/^\n+|\n+$/g, "");
    const block = (label ? "**" + inline(label) + "**\n\n" : "") + "```html\n" + text + "\n```";
    codeBlocks.push(block);
    return "\n\n@@CB" + (codeBlocks.length - 1) + "@@\n\n";
  };

  // 0) コード例テーブル（見出し + pre のみのテーブル）
  s = s.replace(
    /<div class="table-wrap">\s*<table>\s*<thead>\s*<tr>\s*<th>([\s\S]*?)<\/th>\s*<\/tr>\s*<\/thead>\s*<tbody>\s*<tr>\s*<td>\s*<pre[^>]*>([\s\S]*?)<\/pre>\s*<\/td>\s*<\/tr>\s*<\/tbody>\s*<\/table>\s*<\/div>/gi,
    (_, label, code) => stash(label, code)
  );

  // 1) 単独の pre
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => stash(null, code));

  // 2) テーブル
  s = s.replace(/<div class="table-wrap">\s*([\s\S]*?)<\/table>\s*<\/div>/gi, (_, inner) =>
    tableToMd(inner + "</table>")
  );
  s = s.replace(/<table>([\s\S]*?)<\/table>/gi, (m) => tableToMd(m));

  // 3) フロー図（.flow）: ステップを箇条書きに
  s = s.replace(/<div class="flow__step-icon">[\s\S]*?<\/div>/gi, "");
  s = s.replace(/<div class="flow__arrow">[\s\S]*?<\/div>/gi, "");
  s = s.replace(/<div class="flow__step-title">([\s\S]*?)<\/div>/gi, "\n- **$1**");
  s = s.replace(/<div class="flow__step-desc">([\s\S]*?)<\/div>/gi, "：$1");

  // 4) 図キャプション
  s = s.replace(/<div class="figure__caption">([\s\S]*?)<\/div>/gi, "\n\n*（図）$1*\n\n");

  // 5) 用語定義・コールアウトのラベル/アイコン
  s = s.replace(/<div class="term-box__label">[\s\S]*?<\/div>/gi, "\n\n**【用語定義】**\n");
  s = s.replace(/<div class="callout__icon">([\s\S]*?)<\/div>/gi, "");
  s = s.replace(/<div class="callout__title">([\s\S]*?)<\/div>/gi, "\n\n**【$1】** ");

  // 6) 画像
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = (tag.match(/src="([^"]*)"/i) || [])[1] || "";
    const alt = (tag.match(/alt="([^"]*)"/i) || [])[1] || "";
    return "\n\n![" + alt + "](" + src + ")\n\n";
  });

  // 7) リスト
  s = s.replace(/<ul>/gi, "\n").replace(/<\/ul>/gi, "\n");
  s = s.replace(/<ol>/gi, "\n").replace(/<\/ol>/gi, "\n");
  s = s.replace(/<li>([\s\S]*?)<\/li>/gi, (_, c) => "- " + inline(c) + "\n");

  // 8) 段落
  s = s.replace(/<p[^>]*>/gi, "\n\n").replace(/<\/p>/gi, "\n\n");

  // 9) 残りの div / span を除去
  s = s.replace(/<\/?div[^>]*>/gi, "\n");
  s = s.replace(/<\/?span[^>]*>/gi, "");

  // 10) インライン変換 + 残タグ除去
  s = inlineBlock(s);

  // 11) 整形
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  // 12) コードブロックを復元
  s = s.replace(/@@CB(\d+)@@/g, (_, i) => codeBlocks[Number(i)]);

  return s;
}

function letter(i) {
  return String.fromCharCode(65 + i);
}

function chapterToMd(ch) {
  const L = [];
  L.push(`# 第${ch.no}章　${ch.title}`);
  L.push("");
  const meta = [];
  if (ch.phase) meta.push(`フェーズ: ${ch.phase}`);
  if (ch.estimateMinutes) meta.push(`目安: 約${ch.estimateMinutes}分`);
  L.push(`> ${meta.join(" ／ ")}`);
  L.push("");
  if (ch.subtitle) {
    L.push(ch.subtitle);
    L.push("");
  }
  if (Array.isArray(ch.goals) && ch.goals.length) {
    L.push("## 学習目標");
    L.push("");
    ch.goals.forEach((g) => L.push(`- ${inline(g)}`));
    L.push("");
  }
  if (Array.isArray(ch.sections) && ch.sections.length) {
    L.push("## 本文");
    L.push("");
    ch.sections.forEach((sec, i) => {
      L.push(`### ${i + 1}. ${inline(sec.heading || "")}`);
      L.push("");
      L.push(bodyToMd(sec.bodyHtml || ""));
      L.push("");
    });
  }
  if (Array.isArray(ch.summary) && ch.summary.length) {
    L.push("## まとめ");
    L.push("");
    ch.summary.forEach((sm) => L.push(`- ${inline(sm)}`));
    L.push("");
  }
  if (Array.isArray(ch.quiz) && ch.quiz.length) {
    L.push("## 確認テスト");
    L.push("");
    ch.quiz.forEach((q, qi) => {
      const type = q.type === "multi" ? "複数選択" : "単一選択";
      L.push(`### Q${qi + 1}（${type}）`);
      L.push("");
      L.push(inline(q.question));
      L.push("");
      (q.options || []).forEach((opt, oi) => {
        const correct = Array.isArray(q.correct) && q.correct.includes(oi);
        L.push(`- ${letter(oi)}. ${inline(opt)}${correct ? "　✅**（正解）**" : ""}`);
      });
      L.push("");
      if (q.explain) {
        L.push(`**解説**：${inline(q.explain)}`);
        L.push("");
      }
    });
  }
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs.readdirSync(CH_DIR).filter((f) => f.endsWith(".json"));
  const chapters = files
    .map((f) => JSON.parse(fs.readFileSync(path.join(CH_DIR, f), "utf8")))
    .sort((a, b) => a.no - b.no);

  const index = [];
  for (const ch of chapters) {
    const outName = `${ch.slug}.md`;
    fs.writeFileSync(path.join(OUT_DIR, outName), chapterToMd(ch), "utf8");
    index.push(`- 第${ch.no}章 [${ch.title}](${outName})`);
    console.log(`generated: docs/chapters/${outName}`);
  }

  let readme = "# SEO Eラーニング 章別まとめ（Markdown）\n\n";
  readme += "`data/chapters/*.json` から自動生成した章ごとの内容まとめです。\n";
  readme += "再生成: `node scripts/export-markdown.js`\n\n";
  readme += "## 目次\n\n" + index.join("\n") + "\n";
  fs.writeFileSync(path.join(OUT_DIR, "README.md"), readme, "utf8");
  console.log("generated: docs/chapters/README.md");
  console.log(`\n完了: ${chapters.length}章分の .md を生成しました。`);
}

main();
