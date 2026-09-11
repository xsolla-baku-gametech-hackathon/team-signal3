import { Component, ElementRef, computed, DestroyRef, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ACTIONS, ActionConfig } from '../../core/config/action.config';
import { CrowdAction } from '../../core/models/socket.models';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-room',
  imports: [ButtonModule, ProgressBarModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})
export class RoomComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  protected readonly socketService = inject(SocketService);
  protected readonly actions = ACTIONS;
  protected readonly helpActions = ACTIONS.filter((action) => action.side === 'HELP' && !action.vipOnly);
  protected readonly hinderActions = ACTIONS.filter((action) => action.side === 'HINDER');
  protected readonly vipAction = ACTIONS.find((action) => action.vipOnly);
  protected readonly isMasterDirector = computed(() => this.socketService.voterStatus()?.tier === 3);

  protected readonly voterProgress = computed(() => {
    const voter = this.socketService.voterStatus();
    if (!voter || voter.nextTierAt === undefined) return 100;
    const span = voter.nextTierAt - voter.tierStartDp;
    return span <= 0 ? 100 : Math.round(((voter.dp - voter.tierStartDp) / span) * 100);
  });
  protected readonly leaderboard = computed(() => this.socketService.leaderboard()?.entries ?? []);
  protected readonly chatMessages = this.socketService.chatMessages;
  private readonly chatLog = viewChild<ElementRef<HTMLDivElement>>('chatLog');

  protected readonly helpPercent = computed(() => {
    const votes = this.socketService.latestDecision()?.crowdSnapshot.votes;

    if (!votes) {
      return 50;
    }

    const helpTotal = this.helpActions.reduce((sum, action) => sum + (votes[action.type] ?? 0), 0);
    const hinderTotal = this.hinderActions.reduce((sum, action) => sum + (votes[action.type] ?? 0), 0);
    const total = helpTotal + hinderTotal;

    return total === 0 ? 50 : Math.round((helpTotal / total) * 100);
  });
  protected readonly roomId = signal('');
  protected readonly now = signal(Date.now());
  protected readonly cooldownEnds = signal<Partial<Record<CrowdAction, number>>>({});
  protected readonly gameConnected = computed(() => this.socketService.connectionState() === 'ONLINE' && (this.socketService.roomState()?.gameConnected ?? false));
  protected readonly gameLive = computed(() => {
    const state = this.socketService.liveGameState();
    return this.gameConnected() && !state?.gameOver && (!state?.roundPhase || state.roundPhase === 'RUNNING');
  });
  protected readonly roundLabel = computed(() => {
    if (!this.gameConnected()) return 'Waiting for game screen';
    const state = this.socketService.liveGameState();
    if (state?.roundPhase === 'WAITING') return 'Waiting for the player to start';
    if (state?.roundPhase === 'WON') return 'Victory — the player survived!';
    if (state?.roundPhase === 'LOST' || state?.gameOver) return 'Round over — the player fell';
    const seconds = Math.ceil((state?.roundRemainingMs ?? 0) / 1000);
    return state?.roundPhase === 'RUNNING'
      ? `Survive the crowd · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} remaining`
      : 'Arena link established';
  });
  protected readonly crowdCount = computed(() => this.socketService.roomState()?.crowdCount ?? 0);
  protected readonly connectionState = computed(() => this.socketService.connectionState());

  constructor() {
    const roomId = this.route.snapshot.paramMap.get('roomId') ?? '';
    const session = this.socketService.restoreSession();
    const nickname = session.nickname ?? `Guest-${Math.floor(100 + Math.random() * 900)}`;

    if (!/^[A-Z0-9-]{3,24}$/.test(roomId.toUpperCase())) {
      this.router.navigate(['/']);
      return;
    }

    this.roomId.set(roomId.toUpperCase());
    this.socketService.joinCrowd(this.roomId(), nickname);
    const timer = window.setInterval(() => this.now.set(Date.now()), 100);
    this.destroyRef.onDestroy(() => window.clearInterval(timer));

    effect(() => {
      const result = this.socketService.actionResult();

      if (!result) {
        return;
      }

      if (result.status === 'sent') {
        const action = ACTIONS.find((item) => item.type === result.action);
        this.cooldownEnds.update((cooldowns) => ({ ...cooldowns,
          [result.action]: Date.now() + (action?.cooldownMs ?? 1000) }));
        this.messageService.add({ severity: 'success', summary: `${this.formatAction(result.action)} VOTE RECEIVED`, life: 1200 });
        return;
      }

      this.messageService.add({ severity: 'warn', summary: result.message, life: 1400 });
    });

    effect(() => {
      this.chatMessages();
      const log = this.chatLog()?.nativeElement;
      if (log) queueMicrotask(() => { log.scrollTop = log.scrollHeight; });
    });
  }

  protected sendAction(action: ActionConfig): void {
    if (!this.gameLive() || this.socketService.pendingAction() || this.getCooldownRemaining(action.type) > 0) {
      this.messageService.add({ severity: 'warn', summary: 'TOO FAST - WAIT A MOMENT', life: 1100 });
      return;
    }

    this.socketService.sendAction(action.type);
  }

  protected getCooldownRemaining(action: CrowdAction): number {
    return Math.max(0, (this.cooldownEnds()[action] ?? 0) - this.now());
  }

  protected getCooldownProgress(action: ActionConfig): number {
    const remaining = this.getCooldownRemaining(action.type);
    return remaining > 0 ? ((action.cooldownMs - remaining) / action.cooldownMs) * 100 : 100;
  }

  protected formatAction(action: string): string {
    return action.replaceAll('_', ' ');
  }

  protected shortVoterId(voterId: string): string {
    return voterId.slice(0, 6).toUpperCase();
  }

  protected isYou(voterId: string): boolean {
    return voterId === this.socketService.voterId;
  }

  protected sendChat(input: HTMLInputElement): void {
    this.socketService.sendChatMessage(input.value);
    input.value = '';
  }

  protected formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
