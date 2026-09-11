import { RULES } from './rules.js';
import { DirectorDecision, RuleContext } from './rule.types.js';

export class RuleEngine {
  decide(context: RuleContext): DirectorDecision {
    const { snapshot, gameState, roomState } = context;

    if (snapshot.totalActions === 0) {
      return this.noEvent(context, 'No crowd actions in window.');
    }

    if (!roomState.gameConnected) {
      return this.noEvent(context, 'Game is offline.');
    }

    if (snapshot.votes.VIP_SHIELD > 0) {
      return {
        roomId: snapshot.roomId,
        event: { type: 'EMERGENCY_HEAL', amount: RULES.emergencyHealAmount },
        reason: 'A Master Director deployed a VIP Shield Airdrop.',
        snapshot
      };
    }

    if (snapshot.votes.HEAL > 0 && (snapshot.dominantAction === 'HEAL' || (gameState?.hp ?? 100) <= RULES.lowHpThreshold)) {
      if ((gameState?.hp ?? 100) <= RULES.criticalHpThreshold) {
        return {
          roomId: snapshot.roomId,
          event: { type: 'EMERGENCY_HEAL', amount: RULES.emergencyHealAmount },
          reason: 'Player health critical; emergency heal selected.',
          snapshot
        };
      }

      return {
        roomId: snapshot.roomId,
        event: { type: 'HEAL', amount: RULES.healAmount },
        reason: 'Crowd assistance selected.',
        snapshot
      };
    }

    if (snapshot.dominantAction === 'BOSS') {
      if (gameState?.bossActive) {
        return {
          roomId: snapshot.roomId,
          event: snapshot.votes.STORM > 0 && !gameState.stormActive ? { type: 'STORM' } : { type: 'SPAWN_ZOMBIE' },
          reason: 'Boss already active; converted boss pressure into a safe arena threat.',
          snapshot
        };
      }

      if (
        snapshot.dominantVotes >= RULES.bossRushMinVotes &&
        snapshot.consensus >= RULES.bossRushConsensus &&
        snapshot.aggressionScore >= RULES.bossRushAggression
      ) {
        return {
          roomId: snapshot.roomId,
          event: { type: 'BOSS_RUSH' },
          reason: 'High-consensus boss vote triggered boss rush.',
          snapshot
        };
      }

      return {
        roomId: snapshot.roomId,
        event: { type: 'BOSS' },
        reason: 'Boss vote won the crowd window.',
        snapshot
      };
    }

    if (snapshot.dominantAction === 'STORM') {
      return {
        roomId: snapshot.roomId,
        event: gameState?.stormActive ? { type: 'LIGHTNING' } : { type: 'STORM' },
        reason: gameState?.stormActive ? 'Storm already active; converted storm vote to lightning.' : 'Storm vote won the crowd window.',
        snapshot
      };
    }

    if (snapshot.dominantAction === 'LIGHTNING') {
      return {
        roomId: snapshot.roomId,
        event: { type: 'LIGHTNING' },
        reason: 'Lightning vote won the crowd window.',
        snapshot
      };
    }

    return {
      roomId: snapshot.roomId,
      event: { type: 'SPAWN_ZOMBIE' },
      reason: snapshot.aggressionScore >= RULES.highAggression ? 'Aggressive zombie pressure selected.' : 'Zombie vote won the crowd window.',
      snapshot
    };
  }

  private noEvent(context: RuleContext, reason: string): DirectorDecision {
    return {
      roomId: context.snapshot.roomId,
      reason,
      snapshot: context.snapshot
    };
  }
}
