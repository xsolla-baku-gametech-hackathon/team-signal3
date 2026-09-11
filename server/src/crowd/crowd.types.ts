import { CrowdAction } from '../types/events.js';

export type ActionVotes = Record<CrowdAction, number>;

export type CrowdSnapshot = {
  roomId: string;
  windowStartedAt: number;
  windowEndedAt: number;
  totalActions: number;
  uniqueParticipants: number;
  votes: ActionVotes;
  dominantAction: CrowdAction;
  dominantVotes: number;
  consensus: number;
  aggressionScore: number;
  assistanceScore: number;
};
