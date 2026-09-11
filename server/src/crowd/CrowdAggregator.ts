import {
  ACTION_AGGRESSION_WEIGHTS,
  ACTION_ASSISTANCE_WEIGHTS,
  CROWD_ACTIONS
} from './crowd.config.js';
import { ActionVotes, CrowdSnapshot } from './crowd.types.js';
import { CrowdAction } from '../types/events.js';

export class CrowdAggregator {
  private windowStartedAt = Date.now();
  private totalActions = 0;
  private readonly votes = createEmptyVotes();
  private readonly participants = new Set<string>();
  private readonly voterChoices = new Map<string, CrowdAction>();

  constructor(private readonly roomId: string) {}

  addAction(action: CrowdAction, participantId: string, voterId?: string, weight = 1): void {
    this.votes[action] += weight;
    this.totalActions += weight;
    this.participants.add(participantId);
    if (voterId) this.voterChoices.set(voterId, action);
  }

  consumeVoterChoices(): Map<string, CrowdAction> {
    const choices = new Map(this.voterChoices);
    this.voterChoices.clear();
    return choices;
  }

  hasActions(): boolean {
    return this.totalActions > 0;
  }

  snapshot(windowEndedAt = Date.now()): CrowdSnapshot {
    const votes = { ...this.votes };
    const dominantAction = this.getDominantAction(votes);
    const dominantVotes = votes[dominantAction];
    const consensus = this.totalActions > 0 ? dominantVotes / this.totalActions : 0;

    return {
      roomId: this.roomId,
      windowStartedAt: this.windowStartedAt,
      windowEndedAt,
      totalActions: this.totalActions,
      uniqueParticipants: this.participants.size,
      votes,
      dominantAction,
      dominantVotes,
      consensus,
      aggressionScore: this.getWeightedScore(votes, ACTION_AGGRESSION_WEIGHTS),
      assistanceScore: this.getWeightedScore(votes, ACTION_ASSISTANCE_WEIGHTS)
    };
  }

  snapshotAndReset(windowEndedAt = Date.now()): CrowdSnapshot {
    const snapshot = this.snapshot(windowEndedAt);
    this.reset(windowEndedAt);
    return snapshot;
  }

  private reset(nextWindowStartedAt: number): void {
    this.windowStartedAt = nextWindowStartedAt;
    this.totalActions = 0;
    this.participants.clear();
    this.voterChoices.clear();

    for (const action of CROWD_ACTIONS) {
      this.votes[action] = 0;
    }
  }

  private getDominantAction(votes: ActionVotes): CrowdAction {
    return CROWD_ACTIONS.reduce((leader, action) => (votes[action] > votes[leader] ? action : leader), CROWD_ACTIONS[0]);
  }

  private getWeightedScore(votes: ActionVotes, weights: Record<CrowdAction, number>): number {
    if (this.totalActions === 0) {
      return 0;
    }

    const weightedTotal = CROWD_ACTIONS.reduce((total, action) => total + votes[action] * weights[action], 0);
    return clamp(weightedTotal / this.totalActions, 0, 1);
  }
}

function createEmptyVotes(): ActionVotes {
  return {
    SPAWN_ZOMBIE: 0,
    HEAL: 0,
    LIGHTNING: 0,
    STORM: 0,
    BOSS: 0,
    VIP_SHIELD: 0
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
