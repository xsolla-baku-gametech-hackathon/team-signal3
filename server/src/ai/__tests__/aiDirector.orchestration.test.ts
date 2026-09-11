import { describe, expect, it, vi } from 'vitest';
import { AiDirector } from '../AiDirector.js';
import { AiConfig } from '../ai.config.js';
import { AiDirectorInput, RuleDecisionSummary } from '../ai.types.js';
import { resolveFinalDecision } from '../../director/resolveFinalDecision.js';
import { AiProvider } from '../AiProvider.js';
import { AiDirectorOutput } from '../ai.types.js';

const baseGameState: AiDirectorInput['gameState'] = {
  hp: 76,
  shield: 20,
  score: 3100,
  wave: 3,
  enemyCount: 5,
  bossActive: false,
  stormActive: false,
  gameOver: false
};

const ruleBaseline: RuleDecisionSummary = {
  event: 'BOSS_RUSH',
  intensity: 0.78,
  reason: 'Boss dominated the crowd while player health was stable.'
};

const baseConfig: AiConfig = {
  enabled: true,
  mock: false,
  provider: 'gemini',
  apiKey: 'test-key',
  model: 'gemini-1.5-flash',
  timeoutMs: 200
};

function buildInput(overrides: Partial<AiDirectorInput> = {}): AiDirectorInput {
  return {
    roomId: 'DEMO-123',
    crowd: {
      totalActions: 20,
      uniqueParticipants: 14,
      votes: { SPAWN_ZOMBIE: 4, HEAL: 2, LIGHTNING: 3, STORM: 1, BOSS: 10 },
      dominantAction: 'BOSS',
      consensus: 0.5,
      aggressionScore: 0.75,
      assistanceScore: 0.1
    },
    gameState: baseGameState,
    ruleDecision: ruleBaseline,
    allowedEvents: ['NO_EVENT', 'SPAWN_ZOMBIE', 'ZOMBIE_WAVE', 'HEAL', 'EMERGENCY_HEAL', 'LIGHTNING', 'STORM', 'BOSS', 'BOSS_RUSH'],
    ...overrides
  };
}

class StubProvider implements AiProvider {
  constructor(private readonly impl: (input: AiDirectorInput) => Promise<unknown>) {}

  async decide(input: AiDirectorInput): Promise<AiDirectorOutput> {
    return (await this.impl(input)) as AiDirectorOutput;
  }
}

function directorWithStub(impl: (input: AiDirectorInput) => Promise<unknown>, timeoutMs = 200): AiDirector {
  const director = new AiDirector({ ...baseConfig, timeoutMs });
  (director as unknown as { provider: AiProvider }).provider = new StubProvider(impl);
  return director;
}

describe('AI Director disabled', () => {
  it('TEST 1: AI disabled falls back to RuleEngine decision', async () => {
    const director = new AiDirector({ ...baseConfig, enabled: false });
    expect(director.isAvailable()).toBe(false);

    const final = resolveFinalDecision(ruleBaseline, undefined, baseGameState);
    expect(final.event).toBe('BOSS_RUSH');
    expect(final.source).toBe('RULE_ENGINE');
  });
});

describe('AI Director valid decision', () => {
  it('TEST 2: AI returns a valid allowed decision and it is used', async () => {
    const director = directorWithStub(async () => ({ event: 'STORM', intensity: 0.6, reason: 'Safer than boss rush.' }));
    const result = await director.decide(buildInput());

    expect(result.ok).toBe(true);
    if (result.ok) {
      const final = resolveFinalDecision(ruleBaseline, result.output, baseGameState);
      expect(final.event).toBe('STORM');
      expect(final.source).toBe('AI_DIRECTOR');
    }
  });
});

describe('AI Director invalid outputs fall back', () => {
  it('TEST 3: AI returns an unsupported event -> RuleEngine fallback', async () => {
    const director = directorWithStub(async () => ({ event: 'DELETE_EVERYTHING', intensity: 0.5, reason: 'nope' }));
    const result = await director.decide(buildInput());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const final = resolveFinalDecision(ruleBaseline, undefined, baseGameState);
      expect(final.event).toBe(ruleBaseline.event);
      expect(final.source).toBe('RULE_ENGINE');
    }
  });

  it('TEST 4: AI returns malformed JSON -> RuleEngine fallback', async () => {
    const director = directorWithStub(async () => {
      throw new SyntaxError('Unexpected token in JSON');
    });
    const result = await director.decide(buildInput());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fallbackReason).toContain('AI error');
    }
  });

  it('TEST 5: AI timeout -> RuleEngine fallback', async () => {
    const director = directorWithStub(
      () => new Promise((resolve) => setTimeout(() => resolve({ event: 'BOSS', intensity: 0.5, reason: 'slow' }), 500)),
      50
    );
    const result = await director.decide(buildInput());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fallbackReason).toContain('Timeout');
    }
  });

  it('TEST 6: AI returns intensity > 1 -> clamped to 1', async () => {
    const director = directorWithStub(async () => ({ event: 'BOSS_RUSH', intensity: 1.4, reason: 'too much' }));
    const result = await director.decide(buildInput());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.intensity).toBe(1);
    }
  });
});

describe('FinalSafetyValidator hard boundaries', () => {
  it('TEST 7: AI tries BOSS_RUSH while HP critical -> safety validator blocks it', () => {
    const criticalGameState = { ...baseGameState, hp: 12 };
    const emergencyBaseline: RuleDecisionSummary = {
      event: 'EMERGENCY_HEAL',
      intensity: 0.9,
      reason: 'Player health critical; emergency heal selected.'
    };

    const final = resolveFinalDecision(emergencyBaseline, { event: 'BOSS_RUSH', intensity: 0.9, reason: 'crowd wants boss' }, criticalGameState);

    expect(final.event).toBe('EMERGENCY_HEAL');
    expect(final.source).toBe('AI_FALLBACK');
  });

  it('TEST 8: gameOver true forces NO_EVENT regardless of AI', () => {
    const gameOverState = { ...baseGameState, gameOver: true };
    const final = resolveFinalDecision(ruleBaseline, { event: 'BOSS_RUSH', intensity: 0.9, reason: 'crowd wants boss' }, gameOverState);

    expect(final.event).toBe('NO_EVENT');
  });

  it('TEST 9: storm already active rejects an overlapping AI storm proposal', () => {
    const stormState = { ...baseGameState, stormActive: true };
    const final = resolveFinalDecision(ruleBaseline, { event: 'STORM', intensity: 0.6, reason: 'more storm' }, stormState);

    expect(final.event).not.toBe('STORM');
    expect(final.source).toBe('AI_FALLBACK');
  });
});
