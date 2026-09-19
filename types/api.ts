export type ImageAssetDto = {
  id: string;
  url: string;
  width: number;
  height: number;
  mimeType: string;
  sortOrder: number;
};

export type ThoughtDto = {
  id: string;
  content: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  images: ImageAssetDto[];
};

export type StatsDto = {
  month: string;
  totalThoughts: number;
  totalWords: number;
  currentStreak: number;
  activeDays: string[];
  wordCloud: Array<{ text: string; count: number }>;
};
