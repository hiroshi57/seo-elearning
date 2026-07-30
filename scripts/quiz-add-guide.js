/* ==========================================================================
   Google SEO スターターガイドに基づく設問を各章の確認テストに追加する。
   （出典: https://developers.google.com/search/docs/fundamentals/seo-starter-guide）
   id が既に存在する場合はスキップ（再実行安全）。
   実行: node scripts/quiz-add-guide.js
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

// 追加設問（章slug -> 設問配列）。誤答は「ありがちな誤解」レベルに調整。
const ADD = {
  "01-seo-basics": [
    {
      id: "gq_meta",
      type: "single",
      sectionIndex: 2,
      question:
        "Google SEOスターターガイドが「Googleが重要でない（ランキングにほぼ影響しない）と考えている」としているものはどれか。",
      options: [
        "内部リンクでサイト内のページ同士を適切につなぐこと",
        "ページのタイトル（title要素）を内容に合わせて設定すること",
        "keywords（キーワード）メタタグに対策キーワードを列挙すること",
        "ユーザーの検索意図に合った本文コンテンツを用意すること",
      ],
      correct: [2],
      explain:
        "Google検索は keywords（キーワード）メタタグをランキングに利用しません。内部リンク・title・検索意図に合うコンテンツはいずれも有効な施策です。（スターターガイド『Googleが重要でないと考えること』）",
    },
    {
      id: "gq_indextime",
      type: "single",
      sectionIndex: 0,
      question:
        "公開したばかりのページがGoogle検索結果に表示されるまでの考え方として、ガイドの記述に最も近いものはどれか。",
      options: [
        "公開すれば通常は数分以内に必ず表示される",
        "サイトマップを送信した瞬間に全ページが反映される",
        "クロールとインデックスに数日〜数週間かかることがあり、必ず表示される保証もない",
        "Search Consoleでリクエストすれば即座に上位表示される",
      ],
      correct: [2],
      explain:
        "検索結果への反映にはクロール・インデックスの工程があり、数日〜数週間かかることがあります。そもそもインデックスされる保証もありません。（スターターガイド『検索結果への反映にかかる時間』）",
    },
  ],
  "02-google-search-mechanism": [
    {
      id: "gq_exclude",
      type: "single",
      sectionIndex: 0,
      question:
        "特定のページをGoogleの検索結果に表示させたくない場合の対応として、ガイドの記述に最も適切なものはどれか。",
      options: [
        "title要素を空にしてインデックスから外す",
        "robots.txt での不許可や noindex など、適切な方法でクロール/インデックスを制御する",
        "ページを一時的にサーバーエラー（5xx）にし続ける",
        "そのページへの内部リンクをすべて外す",
      ],
      correct: [1],
      explain:
        "表示したくないページは robots.txt でのブロックや noindex など、目的に応じた適切な方法で制御します。リンクを外す・title空・エラー化などは確実な除外方法ではありません。（スターターガイド『Googleの検索結果から除外したい場合』）",
    },
  ],
  "05-writing-seo": [
    {
      id: "gq_alt",
      type: "single",
      sectionIndex: 0,
      question:
        "画像の代替テキスト（alt属性）の付け方として、ガイドの推奨に最も近いものはどれか。",
      options: [
        "対策キーワードをできるだけ多く詰め込む",
        "すべての画像で同じ定型文を使い回す",
        "画像の内容や文脈が伝わる、簡潔で具体的な説明を書く",
        "SEOのため必ず長文で詳細に書く",
      ],
      correct: [2],
      explain:
        "alt属性は画像の内容・文脈が伝わる簡潔で具体的な説明にします。キーワードの詰め込みや無意味な定型文は避けます。（スターターガイド『わかりやすい代替テキストを画像に追加する』）",
    },
    {
      id: "gq_useful",
      type: "single",
      sectionIndex: 0,
      question:
        "「興味深く有益なサイト」にするための考え方として、ガイドの記述に最も近いものはどれか。",
      options: [
        "読者が使いそうな検索キーワードを予測し、その疑問に応える情報を用意する",
        "主要コンテンツより広告を大きく目立たせて配置する",
        "他サイトの文章をできるだけ多くコピーして情報量を増やす",
        "専門家向けに、一般読者には伝わらない表現で書く",
      ],
      correct: [0],
      explain:
        "読者の検索キーワードを予測して有益な情報を提供することが基本です。気が散る広告や独自性のないコピーは避けます。（スターターガイド『興味深く有益なサイトにする』）",
    },
  ],
  "06-technical-seo": [
    {
      id: "gq_url",
      type: "single",
      sectionIndex: 3,
      question: "わかりやすいURLの考え方として、ガイドの記述に最も近いものはどれか。",
      options: [
        "内容と無関係でも短い連番ID（例：/p?id=8421）にする",
        "内容が推測できる意味のある語を使う（例：/blog/cheese-recipe）",
        "対策キーワードをURLの中で何度も繰り返す",
        "階層をできるだけ深くし、パラメータを多く付与する",
      ],
      correct: [1],
      explain:
        "URLは内容が推測できる意味のある語で構成すると、ユーザーにも検索エンジンにも分かりやすくなります。（スターターガイド『わかりやすいURLを使用する』）",
    },
    {
      id: "gq_tld",
      type: "single",
      sectionIndex: 3,
      question:
        "ドメイン名やTLD（「.com」「.guru」など）がGoogleのランキングに与える影響について、ガイドの記述に最も近いものはどれか。",
      options: [
        "「.com」ドメインは常に上位表示されやすい",
        "ドメイン名にキーワードを含めると順位が大きく上がる",
        "ドメイン名/URL中のキーワードやTLDの種類は、ランキングにほとんど影響しない（特定国向けのccTLDを除く）",
        "「.org」は「.com」より信頼され、ランキングが上がる",
      ],
      correct: [2],
      explain:
        "ドメイン名やURL中のキーワード、TLDの種類は基本的にランキングにほとんど影響しません（特定の国のユーザーを狙うccTLDのケースを除く）。（スターターガイド『Googleが重要でないと考えること』）",
    },
  ],
};

function main() {
  let added = 0;
  for (const [slug, questions] of Object.entries(ADD)) {
    const file = path.join(CH_DIR, `${slug}.json`);
    if (!fs.existsSync(file)) {
      console.warn("skip (not found):", slug);
      continue;
    }
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    j.quiz = j.quiz || [];
    const existing = new Set(j.quiz.map((q) => q.id));
    let n = 0;
    for (const q of questions) {
      if (existing.has(q.id)) continue;
      if (q.sectionIndex >= (j.sections ? j.sections.length : 0)) q.sectionIndex = 0;
      j.quiz.push(q);
      n++;
      added++;
    }
    if (n > 0) {
      writeJson(file, j);
      console.log(`updated ${slug}: +${n}問 (計${j.quiz.length}問)`);
    } else {
      console.log(`skip ${slug}: 既に追加済み`);
    }
  }
  console.log(`\n完了: 合計 +${added}問 を追加しました。`);
}
main();
