import { CrowdDirectorClient } from './sdk/CrowdDirectorClient';
import { GameEvent } from './network/network.types';


const params = new URLSearchParams(window.location.search);
const roomId = params.get('room') ?? 'DEMO-123';
const serverUrl = params.get('server') ?? `${window.location.protocol}//${window.location.hostname}:3000`;

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const logEl = document.getElementById('log') as HTMLDivElement;

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function log(message: string): void {
  const line = document.createElement('div');
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logEl.prepend(line);
}

type FlashState = { color: string; untilMs: number };
let flash: FlashState | undefined;
let pulseUntilMs = 0;
const zombieDots: { angle: number; spawnedAtMs: number }[] = [];

const EVENT_COLOR: Record<GameEvent['type'], string> = {
  LIGHTNING: '#e8f4ff',
  STORM: '#6a2fd8',
  BOSS: '#ff8a3d',
  BOSS_RUSH: '#ff4f4f',
  HEAL: '#4fffb0',
  EMERGENCY_HEAL: '#4fffb0',
  SPAWN_ZOMBIE: '#3a4a2a',
  ZOMBIE_WAVE: '#3a4a2a'
};

function handleGameEvent(event: GameEvent): void {
  flash = { color: EVENT_COLOR[event.type], untilMs: performance.now() + 350 };

  if (event.type === 'BOSS' || event.type === 'BOSS_RUSH' || event.type === 'HEAL' || event.type === 'EMERGENCY_HEAL') {
    pulseUntilMs = performance.now() + 500;
  }

  if (event.type === 'SPAWN_ZOMBIE' || event.type === 'ZOMBIE_WAVE') {
    const count = event.type === 'ZOMBIE_WAVE' ? event.count : 1;
    for (let i = 0; i < count; i += 1) {
      zombieDots.push({ angle: Math.random() * Math.PI * 2, spawnedAtMs: performance.now() });
    }
  }

  log(`GAME_EVENT ${event.type}${event.reason ? ` — ${event.reason}` : ''}`);
}

function render(): void {
  requestAnimationFrame(render);
  const now = performance.now();

  const flashActive = flash && now < flash.untilMs;
  ctx.fillStyle = flashActive ? flash!.color : '#05070d';
  ctx.globalAlpha = flashActive ? 0.5 : 1;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const pulsing = now < pulseUntilMs;
  const radius = pulsing ? 46 : 32;

  ctx.fillStyle = '#72ffe7';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  for (let i = zombieDots.length - 1; i >= 0; i -= 1) {
    const dot = zombieDots[i];
    const age = now - dot.spawnedAtMs;
    if (age > 4000) {
      zombieDots.splice(i, 1);
      continue;
    }
    const dist = 90 + Math.min(age / 20, 120);
    ctx.fillStyle = '#ff4fd8';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(dot.angle) * dist, cy + Math.sin(dot.angle) * dist, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

const client = new CrowdDirectorClient({ serverUrl, roomId });
client.onConnected(() => log(`Connected to Crowd Director (room ${roomId})`));
client.onDisconnected(() => log('Disconnected'));
client.onGameEvent(handleGameEvent);
client.onDirectorDecision((decision) => {
  log(`DIRECTOR_DECISION ${decision.final.event} via ${decision.final.source} (${decision.crowdSnapshot.totalActions} votes)`);
});
client.connect();

render();
