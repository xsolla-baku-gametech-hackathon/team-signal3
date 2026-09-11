import { AiProvider } from './AiProvider.js';
import { AiConfig } from './ai.config.js';
import { AiDirectorInput, AiDirectorResult } from './ai.types.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { MockProvider } from './providers/MockProvider.js';
import { validateAiOutput } from './validateAiOutput.js';

class TimeoutError extends Error {}

export class AiDirector {
  private readonly provider?: AiProvider;

  constructor(private readonly config: AiConfig) {
    this.provider = this.selectProvider(config);
  }

  isAvailable(): boolean {
    return this.provider !== undefined;
  }

  async decide(input: AiDirectorInput): Promise<AiDirectorResult> {
    if (!this.provider) {
      return { ok: false, fallbackReason: 'AI Director unavailable (disabled or missing API key).', latencyMs: 0 };
    }

    const startedAt = Date.now();

    try {
      const raw = await this.withTimeout(this.provider.decide(input), this.config.timeoutMs);
      const latencyMs = Date.now() - startedAt;
      const validated = validateAiOutput(raw, input.allowedEvents);

      if (!validated.ok) {
        console.warn(`[AI] Invalid response: ${validated.reason}`);
        return { ok: false, fallbackReason: validated.reason, latencyMs };
      }

      return { ok: true, output: validated.output, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const fallbackReason =
        error instanceof TimeoutError
          ? `Timeout after ${this.config.timeoutMs}ms`
          : `AI error: ${error instanceof Error ? error.message : 'unknown error'}`;

      console.warn(`[AI] ${fallbackReason}`);
      return { ok: false, fallbackReason, latencyMs };
    }
  }

  private selectProvider(config: AiConfig): AiProvider | undefined {
    if (!config.enabled) {
      return undefined;
    }

    if (config.mock) {
      return new MockProvider();
    }

    if (config.provider === 'gemini' && config.apiKey) {
      return new GeminiProvider(config);
    }

    console.warn('[AI] AI_ENABLED is true but no valid provider could be initialized (missing API key). Falling back to RuleEngine only.');
    return undefined;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new TimeoutError()), timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }
}
