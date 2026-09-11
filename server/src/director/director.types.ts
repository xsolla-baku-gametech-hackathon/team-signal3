import { CrowdAction } from '../types/events.js';

export type QueueCrowdActionInput = {
  roomId: string;
  participantId: string;
  action: CrowdAction;
  voterId?: string;
};
