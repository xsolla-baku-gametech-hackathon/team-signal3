import { computed, signal } from '@angular/core';
import { DirectorDecisionBroadcast, DirectorSource } from '../../core/models/socket.models';

export const MAX_HISTORY_ENTRIES = 20;

export type HistoryEntry = {
  timestamp: number;
  event: string;
  source: DirectorSource;
  intensity: number;
};

export class DashboardHistoryStore {
  readonly latest = signal<DirectorDecisionBroadcast | undefined>(undefined);
  readonly history = signal<HistoryEntry[]>([]);
  readonly isEmpty = computed(() => this.latest() === undefined);

  applyDecision(decision: DirectorDecisionBroadcast): void {
    this.latest.set(decision);

    const entry: HistoryEntry = {
      timestamp: decision.timestamp,
      event: decision.final.event,
      source: decision.final.source,
      intensity: decision.final.intensity
    };

    this.history.update((current) => [entry, ...current].slice(0, MAX_HISTORY_ENTRIES));
  }
}
