// ┌──────────────────────────────────────────────────────┐
// │  読み順ガイド                                        │
// │  この main() の4ステップを上から読めば全体が分かる。  │
// │  詳しく見たくなったら各 import 先にジャンプ。          │
// │  設定を変えたい場合は src/settings.ts を開く。        │
// └──────────────────────────────────────────────────────┘

import { loadConfig } from "./config.js";
import { settings } from "./settings.js";
import { fetchHomeTimeline } from "./sources/x-timeline.js";
import { fetchGoogleNews } from "./sources/google-news.js";
import { fetchUrlContents } from "./sources/url-content.js";
import { summarizeUrls } from "./analysis/url-summarizer.js";
import { analyzeTrends } from "./analysis/analyze.js";
import { postToSlack } from "./delivery/slack.js";
import { UserFacingError } from "./utils/errors.js";

async function main() {
  const config = loadConfig();
  const topic = config.TOPIC;

  let tweets;
  if (topic === "hydrogen") {
    tweets = await fetchGoogleNews(settings.schedule.lookbackHours);
  } else {
    console.info("[1/4] X のホームタイムラインを取得中...");
    tweets = await fetchHomeTimeline(config, settings);
  }
  console.info(`→ 記事/ツイート ${tweets.length}件 を取得`);

  console.info("[2/4] URL本文を Jina Reader で取得中...");
  const urlContents = await fetchUrlContents(tweets, config, settings);
  console.info(`→ 本文取得済みURL: ${urlContents.size}件`);

  const enrichedTweets = await summarizeUrls(
    tweets,
    urlContents,
    config,
    settings,
  );
  const analysis = await analyzeTrends(enrichedTweets, config, settings, topic);

  console.info("[4/4] Slack へ投稿中...");
  await postToSlack(analysis, config, topic);

  console.info("すべての処理が完了しました");
}

main().catch((error: unknown) => {
  if (error instanceof UserFacingError) {
    console.error(`\n[USER-FACING] ${error.message}`);
    console.error("対処法の詳細は docs/troubleshooting.md を参照してください。");
    if (error.cause) {
      console.error("[DETAIL]", error.cause);
    }
  } else {
    console.error("\n[INTERNAL] Unexpected error:", error);
  }
  process.exit(1);
});
