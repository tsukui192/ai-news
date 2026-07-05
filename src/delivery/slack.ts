import { WebClient, type KnownBlock, type ChatPostMessageResponse } from "@slack/web-api";
import type { Config, Topic } from "../config.js";
import type { Analysis } from "../analysis/schema.js";
import { UserFacingError } from "../utils/errors.js";

const SLACK_BLOCK_LIMIT = 50;

export async function postToSlack(
  analysis: Analysis,
  config: Config,
  topic: Topic = "ai",
): Promise<void> {
  const client = new WebClient(config.SLACK_BOT_TOKEN);
  const blocks = buildBlocks(analysis, topic);

  const chunks: KnownBlock[][] = [];
  for (let i = 0; i < blocks.length; i += SLACK_BLOCK_LIMIT) {
    chunks.push(blocks.slice(i, i + SLACK_BLOCK_LIMIT));
  }

  for (const chunk of chunks) {
    const res = await client.chat.postMessage({
      channel: config.SLACK_CHANNEL,
      text: "24時間以内のAIトレンド",
      blocks: chunk,
    });
    assertSlackOk(res);
  }

  console.info("Slack 投稿完了");
}

function assertSlackOk(res: ChatPostMessageResponse): void {
  if (res.ok) return;
  const msg =
    res.error === "not_in_channel"
      ? "SlackチャンネルにBotが招待されていません。チャンネルで `/invite @あなたのBot名` を実行してください。"
      : res.error === "channel_not_found"
        ? "SLACK_CHANNEL のIDが見つかりません。GitHub Secrets を確認してください。"
        : `Slack投稿に失敗: ${res.error}`;
  throw new UserFacingError(msg);
}

const TOPIC_TITLES: Record<Topic, string> = {
  ai: "🤖 24時間以内のAIトレンド",
  hydrogen: "⚗️ 24時間以内の水素市場トレンド",
};

function buildBlocks(analysis: Analysis, topic: Topic = "ai"): KnownBlock[] {
  const blocks: KnownBlock[] = [];

  blocks.push({
    type: "header",
    text: { type: "plain_text", text: TOPIC_TITLES[topic], emoji: true },
  });
  blocks.push({ type: "divider" });

  const sections: Array<{ title: string; items: Analysis["main_news"] }> = [
    { title: "🔥 主要なニュース・話題", items: analysis.main_news },
    { title: "⚡️ 注目のアップデート", items: analysis.updates },
    { title: "💡 技術トレンド", items: analysis.tech_trends },
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;

    blocks.push({
      type: "header",
      text: { type: "plain_text", text: section.title, emoji: true },
    });
    blocks.push({ type: "divider" });

    for (const topic of section.items) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*${topic.title}*` },
      });

      if (topic.details.length > 0) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: topic.details.join("\n") },
        });
      }

      if (topic.sources.length > 0) {
        const sourceLinks = topic.sources
          .map((url) => `<${url}>`)
          .join("\n");
        blocks.push({
          type: "context",
          elements: [{ type: "mrkdwn", text: sourceLinks }],
        });
      }
    }
  }

  return blocks;
}
