import { AiProvider } from '../AiProvider.js';
import { AiConfig } from '../ai.config.js';
import { AI_DIRECTOR_SYSTEM_PROMPT } from '../ai.prompt.js';
import { AiDirectorInput, AiDirectorOutput } from '../ai.types.js';

export class GeminiProvider implements AiProvider {
  constructor(private readonly config: AiConfig) {}

  async decide(input: AiDirectorInput): Promise<AiDirectorOutput> {
    if (!this.config.apiKey) {
      throw new Error('Gemini API key is missing.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            role: 'system',
            parts: [{ text: AI_DIRECTOR_SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: JSON.stringify(input) }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini request failed with status ${response.status}`);
      }

      const body = (await response.json()) as GeminiResponse;
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Gemini response did not contain text output.');
      }

      return JSON.parse(text) as AiDirectorOutput;
    } finally {
      clearTimeout(timer);
    }
  }
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};
