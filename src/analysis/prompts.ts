import type { Topic } from "../config.js";

export const URL_SUMMARY_PROMPT = `以下の記事本文を200文字以内の日本語で要約してください。要点だけを簡潔にまとめてください。

---
{article_text}
---

要約:`;

const AI_TREND_ANALYSIS_PROMPT = `あなたはAI技術に精通したアナリストです。以下のJSONデータは、X(旧Twitter)から収集した最新24時間以内のAI関連のツイートです。

タスク:
このデータを分析して、以下の観点で最新のAIトレンドをまとめてください:
- 主要な話題やニュース
- 新しいAIツールやサービスのアップデート
- 注目を集めている技術動向

出力は以下のJSON構造に従ってください:
{
  "main_news": [{"title": "トピック名", "details": ["詳細1", "詳細2"], "sources": ["https://x.com/..."]}],
  "updates": [{"title": "製品名と内容", "details": ["更新内容", "特徴"], "sources": ["https://x.com/..."]}],
  "tech_trends": [{"title": "トレンド名", "details": ["概要", "影響"], "sources": ["https://x.com/..."]}]
}

制約:
- 見出し(title)はそれを読むだけで内容がわかるように具体的に書いてください
- 事実に基づいた客観的な分析を心がけてください
- 複数のソースで言及されている話題を優先してください
- 誇張や推測は避け、データに現れている内容に基づいて記述してください
- detailsの各項目は200文字程度に収めてください
- sourcesにはツイートのURLをそのまま入れてください

以下のJSONデータを分析してください:
{json_data}`;

const HYDROGEN_TREND_ANALYSIS_PROMPT = `あなたは水素エネルギー・水素市場に精通したアナリストです。以下のJSONデータは、X(旧Twitter)から収集した最新24時間以内の水素関連のツイートです。

タスク:
このデータを分析して、以下の観点で最新の水素市場トレンドをまとめてください:
- 主要なニュース・政策・市場動向
- 企業・プロジェクトの新規発表・アップデート
- 注目を集めている技術・インフラ動向

出力は以下のJSON構造に従ってください:
{
  "main_news": [{"title": "トピック名", "details": ["詳細1", "詳細2"], "sources": ["https://x.com/..."]}],
  "updates": [{"title": "企業名・プロジェクト名と内容", "details": ["更新内容", "特徴"], "sources": ["https://x.com/..."]}],
  "tech_trends": [{"title": "トレンド名", "details": ["概要", "影響"], "sources": ["https://x.com/..."]}]
}

制約:
- 見出し(title)はそれを読むだけで内容がわかるように具体的に書いてください
- 事実に基づいた客観的な分析を心がけてください
- 複数のソースで言及されている話題を優先してください
- 誇張や推測は避け、データに現れている内容に基づいて記述してください
- detailsの各項目は200文字程度に収めてください
- sourcesにはツイートのURLをそのまま入れてください

以下のJSONデータを分析してください:
{json_data}`;

export function getTrendAnalysisPrompt(topic: Topic): string {
  return topic === "hydrogen"
    ? HYDROGEN_TREND_ANALYSIS_PROMPT
    : AI_TREND_ANALYSIS_PROMPT;
}

export const TREND_ANALYSIS_PROMPT = AI_TREND_ANALYSIS_PROMPT;
