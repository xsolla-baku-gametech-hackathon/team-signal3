import { CrowdAction, CrowdActionPayload } from '../types/events.js';

const ALLOWED_ACTIONS: readonly CrowdAction[] = ['SPAWN_ZOMBIE', 'HEAL', 'LIGHTNING', 'STORM', 'BOSS', 'VIP_SHIELD'];
const ROOM_ID_PATTERN = /^[A-Z0-9-]{3,24}$/;

export type ValidationResult =
  | { valid: true; payload: CrowdActionPayload }
  | { valid: false; reason: string };

export class CrowdActionProcessor {
  validate(payload: unknown): ValidationResult {
    if (!this.isRecord(payload)) {
      return { valid: false, reason: 'Payload must be an object.' };
    }

    const roomId = payload.roomId;
    const action = payload.action;
    const voterId = payload.voterId;

    if (typeof roomId !== 'string' || !ROOM_ID_PATTERN.test(roomId)) {
      return { valid: false, reason: 'Invalid roomId.' };
    }

    if (typeof action !== 'string' || !this.isCrowdAction(action)) {
      return { valid: false, reason: 'Invalid action.' };
    }

    if (voterId !== undefined && typeof voterId !== 'string') {
      return { valid: false, reason: 'Invalid voterId.' };
    }

    return { valid: true, payload: { roomId, action, voterId } };
  }

  private isCrowdAction(value: string): value is CrowdAction {
    return ALLOWED_ACTIONS.includes(value as CrowdAction);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
