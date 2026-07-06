import { GoogleGenAI } from "@google/genai";
import type { Config } from "../config.js";
import type { Settings } from "../settings.js";
import type { RawTweet, EnrichedTweet } from "../types.js";
import { extractUrls } from "../utils/post-optimizer.js";
import { chunkArray } from "../utils/chunk.js";
import { URL_SUMMARY_PROMPT } from "./prompts.js";

export async function summarizeUrls(
  tweets: RawTweet[],
  urlContents: Map<string, string>,
  config: Config,
  settings: Settings,
): Promise<EnrichedTweet[]> {
  if (urlContents.size === 0) {
    return tweets.map((t) => ({ ...t, enrichedText: buildFullText(t) }));
  }

  console.info("[3a/4] 各URLを Gemini Flash で要約中...");
  const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  const summaryCache = new Map<string, string>();
  const entries = [...urlContents.entries()];

  const chunks = chunkArray(entries, settings.urlContent.parallelism);
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0 && settings.urlContent.interChunkDelayMs > 0) {
      await sleep(settings.urlContent.interChunkDelayMs);
    }
    const chunk = chunks[i];
    const results = await Promise.allSettled(
      chunk.map(async ([url, content]) => {
        const truncated = content.slice(
          0,
          settings.urlContent.maxSummaryChars *
            settings.urlContent.inputCharsMultiplier,
        );
        const prompt = URL_SUMMARY_PROMPT.replace(
          "{article_text}",
          truncated,
        );

        const res = await retryOnRateLimit(() =>
          ai.models.generateContent({
            model: settings.analysis.urlSummaryModel,
            contents: prompt,
            config: { temperature: 0 },
          }),
        );

        const text = res.text?.slice(0, settings.urlContent.maxSummaryChars);
        return { url, summary: text ?? "" };
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.summary) {
        summaryCache.set(r.value.url, r.value.summary);
      }
    }
  }

  console.info(`→ URL要約完了: ${summaryCache.size}件`);

  return tweets.map((tweet) => {
    let enrichedText = buildFullText(tweet);
    for (const url of extractUrls(tweet.text)) {
      const summary = summaryCache.get(url);
      if (summary) {
        enrichedText += `\n[補足情報]: ${summary}`;
      }
    }
    return { ...tweet, enrichedText };
  });
}

function buildFullText(tweet: RawTweet): string {
  let text = tweet.text;
  if (tweet.quotedText) {
    text += `\n${tweet.quotedText}`;
  }
  return text;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryOnRateLimit<T>(
  fn: () => Promise<T>,
  maxRetries = 4,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status =
        (err as { status?: number })?.status ??
        (err as { code?: number })?.code;
      if (status !== 429 || i >= maxRetries - 1) throw err;

      // Gemini の retryDelay をパース（例: "32s"）して待機。取れなければ指数バックオフ。
      const retryDelayStr = (
        err as {
          errorDetails?: Array<{ retryDelay?: string }>;
        }
      )?.errorDetails?.find((d) => d.retryDelay)?.retryDelay;

      const retryMs = retryDelayStr
        ? parseRetryDelay(retryDelayStr)
        : Math.min(2 ** i * 15_000, 60_000);

      console.warn(
        `Gemini 429 レート制限。${retryMs / 1000}秒後にリトライ (${i + 1}/${maxRetries})...`,
      );
      await sleep(retryMs);
    }
  }
  throw new Error("Gemini リトライ上限に達しました");
}

function parseRetryDelay(s: string): number {
  const match = /^(\d+(?:\.\d+)?)s$/.exec(s);
  return match ? Math.ceil(parseFloat(match[1])) * 1000 : 30_000;
}

