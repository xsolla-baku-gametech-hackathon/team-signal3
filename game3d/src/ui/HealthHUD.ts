export class HealthHUD {
  private readonly statsElement: HTMLDivElement;

  constructor() {
    this.statsElement = document.createElement('div');
    this.statsElement.style.cssText = [
      'position:absolute',
      'top:12px',
      'right:12px',
      'color:#dffcff',
      'font:700 14px monospace',
      'letter-spacing:0.06em',
      'background:rgba(3,7,19,0.7)',
      'border:1px solid rgba(114,255,231,0.4)',
      'border-radius:6px',
      'padding:8px 14px',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(this.statsElement);

  }

  update(hp: number, shield: number): void {
    this.statsElement.textContent = `HP ${Math.round(hp)}   SHIELD ${Math.round(shield)}`;
  }

}
