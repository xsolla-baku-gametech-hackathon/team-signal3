import { DirectorSource } from '../network/network.types';

const SOURCE_LABEL: Record<DirectorSource, string> = {
  RULE_ENGINE: 'RULE ENGINE',
  AI_DIRECTOR: 'AI DIRECTOR',
  AI_FALLBACK: 'AI FALLBACK'
};

const SOURCE_COLOR: Record<DirectorSource, string> = {
  RULE_ENGINE: '#72ffe7',
  AI_DIRECTOR: '#7be0a0',
  AI_FALLBACK: '#ffcf7a'
};

export class DirectorDecisionBanner {
  private readonly root: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly eventText: HTMLDivElement;
  private readonly sourceBadge: HTMLDivElement;
  private readonly reasonText: HTMLDivElement;
  private hideTimeout?: number;

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:absolute',
      'top:120px',
      'left:50%',
      'transform:translateX(-50%) scale(0.9)',
      'text-align:center',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 200ms ease-out, transform 200ms ease-out'
    ].join(';');

    this.header = document.createElement('div');
    this.header.textContent = 'CROWD DECIDED';
    this.header.style.cssText = 'color:#dffcff;font:700 13px monospace;letter-spacing:0.25em;opacity:0.8;';

    this.eventText = document.createElement('div');
    this.eventText.style.cssText = [
      'color:#ffffff',
      'font:900 34px monospace',
      'letter-spacing:0.08em',
      'text-shadow:0 0 20px rgba(255,255,255,0.6)',
      'margin:4px 0'
    ].join(';');

    this.sourceBadge = document.createElement('div');
    this.sourceBadge.style.cssText = [
      'display:inline-block',
      'font:800 11px monospace',
      'letter-spacing:0.1em',
      'padding:3px 10px',
      'border-radius:20px',
      'margin-bottom:4px'
    ].join(';');

    this.reasonText = document.createElement('div');
    this.reasonText.style.cssText = 'color:#c7d6e0;font:600 12px monospace;max-width:420px;margin:0 auto;';

    this.root.append(this.header, this.eventText, this.sourceBadge, this.reasonText);
    document.body.appendChild(this.root);
  }

  show(event: string, source: DirectorSource, reason: string, topVoter?: { voterId: string; nickname?: string; tierLabel: string }): void {
    const isMasterDirector = topVoter?.tierLabel === 'Master Director';
    const displayName = topVoter?.nickname || `#${topVoter?.voterId.slice(0, 6).toUpperCase()}`;
    this.header.textContent = isMasterDirector
      ? `👑 ${topVoter.tierLabel.toUpperCase()} ${displayName} TRIGGERED`
      : 'CROWD DECIDED';
    this.header.style.color = isMasterDirector ? '#ffcf7a' : '#dffcff';
    this.header.style.opacity = isMasterDirector ? '1' : '0.8';

    this.eventText.textContent = event.replace(/_/g, ' ');
    this.sourceBadge.textContent = SOURCE_LABEL[source];
    this.sourceBadge.style.color = '#03050c';
    this.sourceBadge.style.background = SOURCE_COLOR[source];
    this.reasonText.textContent = reason;

    this.root.style.opacity = '1';
    this.root.style.transform = 'translateX(-50%) scale(1)';

    window.clearTimeout(this.hideTimeout);
    this.hideTimeout = window.setTimeout(() => {
      this.root.style.opacity = '0';
      this.root.style.transform = 'translateX(-50%) scale(0.9)';
    }, 4000);
  }
}
