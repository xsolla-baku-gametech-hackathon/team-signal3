export class PauseOverlay {
  private readonly button = document.createElement('button');
  private readonly banner = document.createElement('div');
  private paused = false;

  constructor(onToggle: () => void) {
    this.button.style.cssText = [
      'position:absolute',
      'bottom:16px',
      'right:16px',
      'z-index:25',
      'padding:8px 14px',
      'border:1px solid #72ffe7',
      'border-radius:6px',
      'background:rgba(3,7,19,.85)',
      'color:#dffcff',
      'font:700 12px monospace',
      'letter-spacing:0.06em',
      'cursor:pointer'
    ].join(';');
    this.button.textContent = '⏸ PAUSE';
    this.button.addEventListener('click', onToggle);
    document.body.appendChild(this.button);

    this.banner.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'z-index:24',
      'display:none',
      'flex-direction:column',
      'align-items:center',
      'gap:10px',
      'padding:28px 40px',
      'border:1px solid #72ffe7',
      'border-radius:14px',
      'background:rgba(3,7,19,.92)',
      'color:#dffcff',
      'font:900 34px monospace',
      'letter-spacing:0.12em',
      'text-align:center',
      'box-shadow:0 0 60px rgba(0,0,0,.6)'
    ].join(';');
    this.banner.textContent = 'PAUSED';

    const hint = document.createElement('div');
    hint.style.cssText = 'font:700 12px monospace;letter-spacing:0.04em;color:#9dbeca;';
    hint.textContent = 'Press P or click RESUME to continue';
    this.banner.appendChild(hint);

    document.body.appendChild(this.banner);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.button.textContent = paused ? '▶ RESUME' : '⏸ PAUSE';
    this.banner.style.display = paused ? 'flex' : 'none';
  }

  isPaused(): boolean {
    return this.paused;
  }
}
