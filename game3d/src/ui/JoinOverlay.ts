import QRCode from 'qrcode';

export class JoinOverlay {
  private readonly root: HTMLDivElement;
  private readonly image: HTMLImageElement;

  constructor(
    private readonly roomId: string,
    private readonly joinUrl: string
  ) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:absolute',
      'top:70px',
      'right:12px',
      'display:grid',
      'grid-template-columns:1fr 82px',
      'gap:10px',
      'align-items:center',
      'width:min(268px, calc(100vw - 24px))',
      'padding:10px',
      'color:#dffcff',
      'font:600 12px monospace',
      'background:rgba(3,7,19,0.82)',
      'border:1px solid rgba(114,255,231,0.42)',
      'border-radius:8px',
      'box-shadow:0 0 24px rgba(50,246,255,0.15)',
      'pointer-events:none'
    ].join(';');

    const copy = document.createElement('div');
    copy.style.cssText = 'display:grid;gap:2px;';
    copy.innerHTML = `
      <span style="color:#72ffe7;font-weight:800;letter-spacing:0.08em;">JOIN THE CROWD</span>
      <strong style="color:#ffffff;font-size:20px;">${this.roomId}</strong>
      <small style="color:#72ffe7;font-weight:800;letter-spacing:0.08em;">crowd-director</small>
    `;

    this.image = document.createElement('img');
    this.image.alt = `QR code for ${this.roomId}`;
    this.image.style.cssText = 'width:82px;height:82px;border-radius:4px;background:#dffcff;';

    const link = document.createElement('a');
    link.href = this.joinUrl;
    link.textContent = this.joinUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.cssText = 'grid-column:1/-1;color:#9dbeca;font-size:10px;overflow-wrap:anywhere;pointer-events:auto;';
    this.root.append(copy, this.image, link);
    document.body.appendChild(this.root);
    this.renderQr();
  }

  destroy(): void {
    this.root.remove();
  }

  private renderQr(): void {
    QRCode.toDataURL(this.joinUrl, {
      width: 116,
      margin: 1,
      color: { dark: '#02050d', light: '#dffcff' }
    })
      .then((url) => {
        this.image.src = url;
      })
      .catch(() => {
        this.image.style.display = 'none';
      });
  }
}
