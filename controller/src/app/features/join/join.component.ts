import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { environment } from '../../../environments/environment';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-join',
  imports: [FormsModule, ButtonModule, InputTextModule, TagModule],
  templateUrl: './join.component.html',
  styleUrl: './join.component.css'
})
export class JoinComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly socketService = inject(SocketService);
  protected readonly roomLocked = signal(false);
  protected readonly roomCode = signal(environment.defaultRoomId);
  protected readonly nickname = signal('');
  protected readonly roomError = signal('');
  protected readonly connectionLabel = computed(() => this.socketService.connectionState());

  constructor() {
    const routeRoomId = this.route.snapshot.paramMap.get('roomId');
    const restored = this.socketService.restoreSession();

    if (routeRoomId) {
      this.roomCode.set(routeRoomId.toUpperCase());
      this.roomLocked.set(true);
    } else if (restored.roomId) {
      this.roomCode.set(restored.roomId);
    }

    if (restored.nickname) {
      this.nickname.set(restored.nickname);
    }

    this.socketService.connect();
  }

  protected join(): void {
    const roomId = this.roomCode().trim().toUpperCase();
    const nickname = this.nickname().trim() || `Guest-${Math.floor(100 + Math.random() * 900)}`;

    if (!/^[A-Z0-9-]{3,24}$/.test(roomId)) {
      this.roomError.set('Use 3–24 letters, numbers or hyphens for the room code.');
      return;
    }
    this.socketService.rememberSession(roomId, nickname);
    this.router.navigate(['/room', roomId]);
  }
}
