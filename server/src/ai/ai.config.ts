export type AiConfig = {
  enabled: boolean;
  mock: boolean;
  provider: 'gemini';
  apiKey?: string;
  model: string;
  timeoutMs: number;
};

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true';

export const aiConfig: AiConfig = {
  enabled: parseBoolean(process.env.AI_ENABLED),
  mock: parseBoolean(process.env.AI_MOCK),
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
  model: process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash',
  timeoutMs: parsePositiveInteger(process.env.AI_TIMEOUT_MS, 2500)
};
