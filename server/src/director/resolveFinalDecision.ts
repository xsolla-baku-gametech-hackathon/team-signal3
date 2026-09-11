import { AiDirectorInput, AiDirectorOutput, RuleDecisionSummary } from '../ai/ai.types.js';
import { DirectorSource } from '../types/events.js';
import { checkEventSafety, clamp } from './FinalSafetyValidator.js';

export type FinalDecision = {
  event: RuleDecisionSummary['event'];
  intensity: number;
  reason: string;
  source: DirectorSource;
  safetyOverride?: string;
};

export function resolveFinalDecision(
  ruleBaseline: RuleDecisionSummary,
  aiOutput: AiDirectorOutput | undefined,
  gameState: AiDirectorInput['gameState']
): FinalDecision {
  let candidate: FinalDecision = aiOutput
    ? { event: aiOutput.event, intensity: clamp(aiOutput.intensity, 0, 1), reason: aiOutput.reason, source: 'AI_DIRECTOR' }
    : { event: ruleBaseline.event, intensity: ruleBaseline.intensity, reason: ruleBaseline.reason, source: 'RULE_ENGINE' };

  const check = checkEventSafety(candidate.event, gameState);

  if (check.safe) {
    return candidate;
  }

  if (candidate.source === 'AI_DIRECTOR') {
    candidate = {
      event: ruleBaseline.event,
      intensity: ruleBaseline.intensity,
      reason: ruleBaseline.reason,
      source: 'AI_FALLBACK',
      safetyOverride: check.reason
    };

    const secondCheck = checkEventSafety(candidate.event, gameState);

    if (secondCheck.safe) {
      return candidate;
    }

    return { event: 'NO_EVENT', intensity: 0, reason: secondCheck.reason, source: 'AI_FALLBACK', safetyOverride: secondCheck.reason };
  }

  return { event: 'NO_EVENT', intensity: 0, reason: check.reason, source: candidate.source, safetyOverride: check.reason };
}
