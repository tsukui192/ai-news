import type { RawTweet } from "../types.js";

const RSS_FEEDS = [
  "https://news.google.com/rss/search?q=hydrogen+market+OR+green+hydrogen+OR+hydrogen+energy+OR+hydrogen+fuel+cell&hl=en&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=%E6%B0%B4%E7%B4%A0+%E5%B8%82%E5%A0%B4+OR+%E6%B0%B4%E7%B4%A0%E3%82%A8%E3%83%8D%E3%83%AB%E3%82%AE%E3%83%BC+OR+%E3%82%B0%E3%83%AA%E3%83%BC%E3%83%B3%E6%B0%B4%E7%B4%A0&hl=ja&gl=JP&ceid=JP:ja",
];

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
}

export async function fetchGoogleNews(
  lookbackHours: number,
): Promise<RawTweet[]> {
  console.info("[1/4] Google News RSS から水素市場ニュースを取得中...");
  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const allItems: RssItem[] = [];

  for (const url of RSS_FEEDS) {
    try {
      const items = await fetchRss(url, cutoff);
      allItems.push(...items);
    } catch (err) {
      console.warn(`RSS取得失敗 (${url}):`, err);
    }
  }

  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });

  return unique.map((item) => ({
    authorId: item.source,
    text: `${item.title}\n${item.description}`.trim(),
    createdAt: item.pubDate,
    url: item.link,
  }));
}

async function fetchRss(url: string, cutoff: Date): Promise<RssItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; news-bot/1.0)" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return parseRssItems(xml, cutoff);
}

function parseRssItems(xml: string, cutoff: Date): RssItem[] {
  const items: RssItem[] = [];
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractGoogleLink(block);
    const pubDate = extractTag(block, "pubDate");
    const source = extractAttr(block, "source") || "Unknown";
    const description = stripHtml(extractTag(block, "description"));

    if (!title || !link) continue;
    if (pubDate && new Date(pubDate) < cutoff) continue;

    items.push({ title, link, pubDate: pubDate || "", source, description });
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

function extractAttr(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

function extractGoogleLink(block: string): string {
  const m = block.match(/<link\s*\/?>(.*?)<\/link>|<link>(.*?)<\/link>/s);
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
