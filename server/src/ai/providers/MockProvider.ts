import { AiProvider } from '../AiProvider.js';
import { AiDirectorInput, AiDirectorOutput } from '../ai.types.js';

export class MockProvider implements AiProvider {
  async decide(input: AiDirectorInput): Promise<AiDirectorOutput> {
    const { ruleDecision, gameState } = input;

    if (gameState.hp <= 30 && ruleDecision.event !== 'HEAL' && ruleDecision.event !== 'EMERGENCY_HEAL') {
      return {
        event: 'HEAL',
        intensity: 0.4,
        reason: 'Mock: player health is low, prioritizing survival.'
      };
    }

    return {
      event: ruleDecision.event,
      intensity: clamp(ruleDecision.intensity + 0.05, 0, 1),
      reason: `Mock: agreeing with rule baseline (${ruleDecision.event}).`
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
