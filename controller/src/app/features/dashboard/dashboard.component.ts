import { Component, DestroyRef, OnInit, computed, effect, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { environment } from '../../../environments/environment';
import { DirectorGameState, DirectorSource } from '../../core/models/socket.models';
import { DashboardHistoryStore } from './dashboard-history.store';
import { DirectorSocketConnection } from './director-socket.connection';

const SOURCE_SEVERITY: Record<DirectorSource, 'success' | 'info' | 'warn'> = {
  RULE_ENGINE: 'info',
  AI_DIRECTOR: 'success',
  AI_FALLBACK: 'warn'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TagModule, DecimalPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = new DashboardHistoryStore();
  protected readonly connection = new DirectorSocketConnection(this.resolveSocketUrl());

  protected readonly connectionState = this.connection.connectionState;
  protected readonly latest = this.store.latest;
  protected readonly history = this.store.history;
  protected readonly isEmpty = this.store.isEmpty;

  protected readonly voteEntries = computed(() => {
    const decision = this.latest();

    if (!decision) {
      return [];
    }

    return Object.entries(decision.crowdSnapshot.votes).sort(([, a], [, b]) => b - a);
  });

  protected readonly gameState = computed<DirectorGameState | undefined>(() => {
    const live = this.connection.liveGameState();

    if (live) {
      return {
        hp: live.hp,
        shield: live.shield,
        score: live.score,
        wave: live.wave,
        enemyCount: live.enemyCount ?? 0,
        bossActive: live.bossActive ?? false,
        stormActive: live.stormActive ?? false,
        gameOver: live.gameOver ?? false
      };
    }

    return this.latest()?.gameState;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.connection.disconnect());

    effect(() => {
      const decision = this.connection.latestDecision();

      if (decision) {
        this.store.applyDecision(decision);
      }
    });
  }

  ngOnInit(): void {
    const roomId = (this.route.snapshot.paramMap.get('roomId') ?? environment.defaultRoomId).toUpperCase();
    this.connection.connect(roomId);
  }

  protected severityFor(source: DirectorSource): 'success' | 'info' | 'warn' {
    return SOURCE_SEVERITY[source];
  }

  private resolveSocketUrl(): string {
    if (environment.socketUrl) {
      return environment.socketUrl;
    }

    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
}
