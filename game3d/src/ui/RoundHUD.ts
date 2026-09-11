import { RoundSnapshot } from '../systems/RoundSystem';

export function formatRoundTime(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export class RoundHUD {
  private readonly clock = document.createElement('div');
  private readonly panel = document.createElement('section');
  private readonly title = document.createElement('h1');
  private readonly description = document.createElement('p');
  private readonly button = document.createElement('button');
  private ready = false;
  private finished = false;

  constructor(onStart: () => void, onRestart: () => void) {
    this.clock.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);padding:10px 20px;background:rgba(3,7,19,.86);border:1px solid #72ffe7;border-radius:8px;color:#dffcff;font:800 16px monospace;text-align:center;pointer-events:none;white-space:pre-line;';
    this.clock.setAttribute('role', 'timer');
    this.clock.textContent = 'SURVIVE THE CROWD\n3:00';
    this.panel.style.cssText = 'position:absolute;z-index:20;top:50%;left:50%;transform:translate(-50%,-50%);width:min(440px,calc(100vw - 48px));box-sizing:border-box;padding:28px;border:1px solid #72ffe7;border-radius:14px;background:rgba(3,7,19,.94);color:#dffcff;font:600 14px monospace;text-align:center;box-shadow:0 0 60px rgba(0,0,0,.6);';
    this.panel.setAttribute('aria-labelledby', 'round-title');
    this.title.id = 'round-title';
    this.title.style.cssText = 'margin:0 0 16px;font-size:30px;color:#72ffe7;';
    this.title.textContent = 'SURVIVE THE CROWD';
    this.description.style.cssText = 'line-height:1.7;white-space:pre-line;margin:0 0 20px;';
    this.description.textContent = 'Survive for 3 minutes. The crowd shapes your fight.\nWASD to move · Click or Q to attack\nE / R / F / V / X for spells · Space to jump';
    this.button.style.cssText = 'cursor:pointer;padding:12px 24px;border:0;border-radius:8px;background:#72ffe7;color:#03050c;font:800 16px monospace;';
    this.button.textContent = 'LOADING ARENA…';
    this.button.disabled = true;
    this.button.addEventListener('click', () => {
      if (this.finished) onRestart();
      else if (this.ready) onStart();
    });
    this.panel.append(this.title, this.description, this.button);
    document.body.append(this.clock, this.panel);
  }

  setReady(): void {
    this.ready = true;
    this.button.disabled = false;
    this.button.textContent = 'START ROUND';
  }

  showLoadError(): void {
    this.finished = true;
    this.title.textContent = 'ARENA COULD NOT LOAD';
    this.description.textContent = 'Check your connection and reload to try again.';
    this.button.disabled = false;
    this.button.textContent = 'RELOAD';
  }

  update(snapshot: RoundSnapshot, kills: number, crowdEvents: number): void {
    if (this.finished) return;
    const { phase, remainingMs, elapsedMs, wave } = snapshot;
    if (phase === 'WAITING') return;
    const urgent = remainingMs <= 30_000;
    this.clock.textContent = `${urgent ? 'FINAL STAND' : `WAVE ${wave} / 6`} · ${formatRoundTime(remainingMs)}`;
    this.clock.style.color = urgent ? '#ffcf7a' : '#dffcff';
    if (phase === 'RUNNING') {
      this.panel.style.display = 'none';
      return;
    }
    this.finished = true;
    const won = phase === 'WON';
    this.clock.textContent = won ? 'ROUND COMPLETE' : 'ROUND ENDED';
    this.panel.style.display = 'block';
    this.panel.setAttribute('role', 'dialog');
    this.title.textContent = won ? 'YOU SURVIVED' : 'YOU FELL';
    this.title.style.color = won ? '#72ffe7' : '#ff5fae';
    this.description.textContent = `${won ? 'Three minutes. One survivor. A whole crowd.' : 'The forest claimed another challenger.'}\n\nSurvived ${formatRoundTime(elapsedMs)} / 3:00\nEnemies defeated: ${kills}\nCrowd events: ${crowdEvents}`;
    this.button.textContent = 'PLAY AGAIN';
    this.button.disabled = false;
    this.button.focus();
  }
}
