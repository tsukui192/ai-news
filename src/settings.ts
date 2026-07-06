export interface Settings {
  schedule: {
    lookbackHours: number;
    maxTweets: number;
  };
  urlContent: {
    enabled: boolean;
    timeoutMs: number;
    parallelism: number;
    interChunkDelayMs: number;
    maxSummaryChars: number;
    inputCharsMultiplier: number;
  };
  analysis: {
    urlSummaryModel: string;
    trendAnalysisModel: string;
    temperature: number;
  };
}

export const settings: Settings = {
  schedule: {
    lookbackHours: 24,
    maxTweets: 200,
  },
  urlContent: {
    enabled: true,
    timeoutMs: 10_000,
    // Gemini 無料枠: gemini-2.5-flash は 5 req/分。4並列×チャンク間15秒で安全マージンを確保
    parallelism: 4,
    interChunkDelayMs: 15_000,
    maxSummaryChars: 200,
    inputCharsMultiplier: 20,
  },
  analysis: {
    urlSummaryModel: "gemini-2.5-flash",
    trendAnalysisModel: "gemini-2.5-flash",
    temperature: 0,
  },
};
