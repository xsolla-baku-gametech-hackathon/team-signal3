import { Server } from 'socket.io';
import { AiDirector } from '../ai/AiDirector.js';
import { AiDirectorOutput } from '../ai/ai.types.js';
import { CrowdAggregator } from '../crowd/CrowdAggregator.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { RuleEngine } from '../rules/RuleEngine.js';
import { buildAiInput, toGameEvent, toRuleDecisionSummary } from './director.mapping.js';
import { QueueCrowdActionInput } from './director.types.js';
import { resolveFinalDecision } from './resolveFinalDecision.js';
import { VoterScoreService } from '../voters/VoterScoreService.js';
import {
  ClientToServerEvents,
  DirectorDecisionBroadcast,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
  VoterStatus,
  SOCKET_EVENTS
} from '../types/events.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export class DirectorService {
  private readonly aggregators = new Map<string, CrowdAggregator>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly io: AppServer,
    private readonly roomManager: RoomManager,
    private readonly ruleEngine: RuleEngine,
    private readonly aggregationWindowMs: number,
    private readonly aiDirector: AiDirector,
    private readonly voterScores: VoterScoreService = new VoterScoreService()
  ) {}

  queueAction(input: QueueCrowdActionInput): void {
    const room = this.roomManager.getRoom(input.roomId);
    if (!room?.gameSocketId || room.gameState?.gameOver ||
        (room.gameState?.roundPhase && room.gameState.roundPhase !== 'RUNNING')) return;
    const aggregator = this.getOrCreateAggregator(input.roomId);
    const voterId = input.voterId ?? input.participantId;
    const weight = this.voterScores.getWeight(input.roomId, voterId);
    aggregator.addAction(input.action, input.participantId, voterId, weight);
    this.scheduleFlush(input.roomId);
  }

  clearRoom(roomId: string): void {
    const timer = this.timers.get(roomId);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
    }

    this.aggregators.delete(roomId);
  }

  private scheduleFlush(roomId: string): void {
    if (this.timers.has(roomId)) {
      return;
    }

    const timer = setTimeout(() => {
      void this.flush(roomId);
    }, this.aggregationWindowMs);
    this.timers.set(roomId, timer);
  }

  private async flush(roomId: string): Promise<void> {
    this.timers.delete(roomId);
    const aggregator = this.aggregators.get(roomId);

    if (!aggregator?.hasActions()) {
      return;
    }

    const voterChoices = aggregator.consumeVoterChoices();
    const snapshot = aggregator.snapshotAndReset();
    const room = this.roomManager.getRoom(roomId);
    const gameSocketId = room?.gameSocketId;
    if (!gameSocketId) return;
    const hpBeforeDecision = room?.gameState?.hp ?? 100;
    const decision = this.ruleEngine.decide({
      snapshot,
      gameState: room?.gameState,
      roomState: this.roomManager.getRoomState(roomId)
    });

    const ruleBaseline = toRuleDecisionSummary(decision);
    console.info(
      `[DIRECTOR] room=${roomId} actions=${snapshot.totalActions} participants=${snapshot.uniqueParticipants} ` +
        `Rule baseline: ${ruleBaseline.event} / ${ruleBaseline.intensity.toFixed(2)} — ${ruleBaseline.reason}`
    );

    const aiInput = buildAiInput(roomId, snapshot, room?.gameState, ruleBaseline);
    let aiOutput: AiDirectorOutput | undefined;
    let aiLatencyMs: number | undefined;
    let fallbackReason: string | undefined;

    if (this.aiDirector.isAvailable()) {
      console.info(`[AI] Request started (room=${roomId})`);
      const result = await this.aiDirector.decide(aiInput);
      aiLatencyMs = result.latencyMs;

      if (result.ok) {
        aiOutput = result.output;
        console.info(`[AI] Selected: ${result.output.event} / ${result.output.intensity.toFixed(2)}`);
      } else {
        fallbackReason = result.fallbackReason;
        console.info('[DIRECTOR] Using RuleEngine fallback');
      }
    }

    if (this.aggregators.get(roomId) !== aggregator || room?.gameSocketId !== gameSocketId) return;
    const currentGameState = buildAiInput(roomId, snapshot, room?.gameState, ruleBaseline).gameState;
    const final = resolveFinalDecision(ruleBaseline, aiOutput, currentGameState);

    if (final.safetyOverride) {
      console.info(`[DIRECTOR] Safety override: ${final.safetyOverride}`);
      fallbackReason = fallbackReason ?? final.safetyOverride;
    }

    console.info(`[DIRECTOR] Final: ${final.event} / ${final.intensity.toFixed(2)} Source: ${final.source}`);

    const voterStatuses: Record<string, VoterStatus> = {};
    for (const [voterId, chosenAction] of voterChoices) {
      voterStatuses[voterId] = this.voterScores.scoreVote(
        roomId,
        voterId,
        chosenAction,
        snapshot.dominantAction,
        hpBeforeDecision
      );
    }
    const topVoterEntry = Object.values(voterStatuses).find((status) => status.tier === 3);
    const topVoter = topVoterEntry
      ? { voterId: topVoterEntry.voterId, nickname: topVoterEntry.nickname, tierLabel: topVoterEntry.tierLabel }
      : undefined;

    const broadcast: DirectorDecisionBroadcast = {
      roomId,
      timestamp: Date.now(),
      ruleBaseline,
      aiProposal: aiOutput,
      final,
      aiLatencyMs,
      fallbackReason,
      crowdSnapshot: {
        totalActions: snapshot.totalActions,
        uniqueParticipants: snapshot.uniqueParticipants,
        votes: snapshot.votes,
        dominantAction: snapshot.dominantAction,
        consensus: snapshot.consensus,
        aggressionScore: snapshot.aggressionScore,
        assistanceScore: snapshot.assistanceScore
      },
      gameState: currentGameState,
      voterStatuses,
      topVoter
    };
    this.io.to(roomId).emit(SOCKET_EVENTS.DIRECTOR_DECISION, broadcast);

    if (final.event === 'NO_EVENT' || !room?.gameSocketId) {
      return;
    }

    const gameEvent = toGameEvent(final.event, final.intensity, final.reason, final.source);

    if (!gameEvent) {
      return;
    }

    this.io.to(room.gameSocketId).emit(SOCKET_EVENTS.GAME_EVENT, gameEvent);
  }

  private getOrCreateAggregator(roomId: string): CrowdAggregator {
    const existing = this.aggregators.get(roomId);

    if (existing) {
      return existing;
    }

    const aggregator = new CrowdAggregator(roomId);
    this.aggregators.set(roomId, aggregator);
    return aggregator;
  }
}
