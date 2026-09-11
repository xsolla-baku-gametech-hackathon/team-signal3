import * as tmi from 'tmi.js';
import { DirectorService } from '../director/DirectorService.js';
import { ChatVoteRateLimiter } from './ChatVoteRateLimiter.js';
import { parseTwitchCommand } from './parseTwitchCommand.js';

const MIN_VOTE_INTERVAL_MS = 2000;

export class TwitchChatBridge {
  private readonly client: tmi.Client;
  private readonly rateLimiter = new ChatVoteRateLimiter(MIN_VOTE_INTERVAL_MS);

  constructor(
    private readonly channel: string,
    private readonly roomId: string,
    private readonly directorService: DirectorService
  ) {
    this.client = new tmi.Client({ channels: [channel] });
    this.client.on('message', this.handleMessage);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.info(`[TWITCH] Listening to #${this.channel} chat, forwarding votes into room ${this.roomId}`);
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  private readonly handleMessage = (_channel: string, tags: tmi.ChatUserstate, message: string, self: boolean): void => {
    if (self) {
      return;
    }

    const action = parseTwitchCommand(message);

    if (!action) {
      return;
    }

    const userId = tags['user-id'] ?? tags.username ?? 'unknown-twitch-user';

    if (!this.rateLimiter.tryConsume(userId)) {
      return;
    }

    this.directorService.queueAction({
      roomId: this.roomId,
      participantId: `twitch:${userId}`,
      action
    });
  };
}
