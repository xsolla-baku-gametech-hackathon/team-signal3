import { describe, expect, it } from 'vitest';
import { DirectorDecisionBroadcast } from '../../core/models/socket.models';
import { DashboardHistoryStore, MAX_HISTORY_ENTRIES } from './dashboard-history.store';

function buildDecision(overrides: Partial<DirectorDecisionBroadcast> = {}): DirectorDecisionBroadcast {
  return {
    roomId: 'DEMO-123',
    timestamp: Date.now(),
    ruleBaseline: { event: 'BOSS', intensity: 0.7, reason: 'Boss vote won the crowd window.' },
    final: { event: 'BOSS', intensity: 0.7, reason: 'Boss vote won the crowd window.', source: 'RULE_ENGINE' },
    crowdSnapshot: {
      totalActions: 10,
      uniqueParticipants: 6,
      votes: { BOSS: 6, HEAL: 2, LIGHTNING: 1, STORM: 1, SPAWN_ZOMBIE: 0 },
      dominantAction: 'BOSS',
      consensus: 0.6,
      aggressionScore: 0.7,
      assistanceScore: 0.2
    },
    gameState: {
      hp: 76,
      shield: 20,
      score: 3100,
      wave: 3,
      enemyCount: 5,
      bossActive: false,
      stormActive: false,
      gameOver: false
    },
    ...overrides
  };
}

describe('DashboardHistoryStore', () => {
  it('TEST 1: starts empty with no decisions', () => {
    const store = new DashboardHistoryStore();

    expect(store.isEmpty()).toBe(true);
    expect(store.latest()).toBeUndefined();
    expect(store.history()).toEqual([]);
  });

  it('TEST 2: displays a RULE_ENGINE-sourced decision', () => {
    const store = new DashboardHistoryStore();
    const decision = buildDecision();

    store.applyDecision(decision);

    expect(store.isEmpty()).toBe(false);
    expect(store.latest()?.final.source).toBe('RULE_ENGINE');
    expect(store.latest()?.final.event).toBe('BOSS');
    expect(store.history()[0].source).toBe('RULE_ENGINE');
  });

  it('TEST 3: displays an AI_DIRECTOR-sourced decision with latency', () => {
    const store = new DashboardHistoryStore();
    const decision = buildDecision({
      aiProposal: { event: 'STORM', intensity: 0.6, reason: 'Safer than boss rush.' },
      final: { event: 'STORM', intensity: 0.6, reason: 'Safer than boss rush.', source: 'AI_DIRECTOR' },
      aiLatencyMs: 812
    });

    store.applyDecision(decision);

    expect(store.latest()?.final.source).toBe('AI_DIRECTOR');
    expect(store.latest()?.aiLatencyMs).toBe(812);
    expect(store.latest()?.aiProposal?.event).toBe('STORM');
  });

  it('TEST 4: displays an AI_FALLBACK decision with a fallback reason', () => {
    const store = new DashboardHistoryStore();
    const decision = buildDecision({
      aiProposal: { event: 'BOSS_RUSH', intensity: 0.9, reason: 'crowd wants boss' },
      final: { event: 'EMERGENCY_HEAL', intensity: 0.9, reason: 'Player HP critical.', source: 'AI_FALLBACK' },
      fallbackReason: 'Player HP critical; lethal event rejected.'
    });

    store.applyDecision(decision);

    expect(store.latest()?.final.source).toBe('AI_FALLBACK');
    expect(store.latest()?.fallbackReason).toBe('Player HP critical; lethal event rejected.');
  });

  it('TEST 5: caps history at the max length and drops the oldest entries', () => {
    const store = new DashboardHistoryStore();

    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i += 1) {
      store.applyDecision(buildDecision({ timestamp: i, final: { event: `EVENT_${i}`, intensity: 0.5, reason: 'x', source: 'RULE_ENGINE' } }));
    }

    const history = store.history();
    expect(history).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(history[0].event).toBe(`EVENT_${MAX_HISTORY_ENTRIES + 4}`);
    expect(history[history.length - 1].event).toBe('EVENT_5');
  });
});
