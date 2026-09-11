import { AiDirectorOutput, DirectorEventType } from './ai.types.js';

export type ValidationResult =
  | { ok: true; output: AiDirectorOutput }
  | { ok: false; reason: string };

const MAX_REASON_LENGTH = 200;

export function validateAiOutput(raw: unknown, allowedEvents: DirectorEventType[]): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'AI response was not a JSON object.' };
  }

  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.event !== 'string' || !allowedEvents.includes(candidate.event as DirectorEventType)) {
    return { ok: false, reason: `AI selected an unsupported event: ${String(candidate.event)}` };
  }

  if (typeof candidate.intensity !== 'number' || !Number.isFinite(candidate.intensity)) {
    return { ok: false, reason: 'AI intensity was not a finite number.' };
  }

  if (typeof candidate.reason !== 'string' || candidate.reason.trim().length === 0) {
    return { ok: false, reason: 'AI reason was missing or empty.' };
  }

  const intensity = clamp(candidate.intensity, 0, 1);
  const reason = candidate.reason.trim().slice(0, MAX_REASON_LENGTH);

  return {
    ok: true,
    output: {
      event: candidate.event as DirectorEventType,
      intensity,
      reason
    }
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
