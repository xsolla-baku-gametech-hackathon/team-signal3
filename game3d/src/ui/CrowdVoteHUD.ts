import { CrowdSnapshotSummary } from '../network/network.types';

export class CrowdVoteHUD {
  private readonly root: HTMLDivElement;
  private readonly title: HTMLDivElement;
  private readonly barsContainer: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:absolute',
      'top:60px',
      'left:12px',
      'width:220px',
      'color:#dffcff',
      'font:600 11px monospace',
      'background:rgba(3,7,19,0.75)',
      'border:1px solid rgba(114,255,231,0.4)',
      'border-radius:8px',
      'padding:10px 12px',
      'pointer-events:none'
    ].join(';');

    this.title = document.createElement('div');
    this.title.style.cssText = 'font-weight:800;letter-spacing:0.08em;margin-bottom:8px;color:#72ffe7;';
    this.title.textContent = 'CROWD VOTE — waiting...';

    this.barsContainer = document.createElement('div');
    this.barsContainer.style.cssText = 'display:flex;flex-direction:column;gap:5px;';

    this.root.append(this.title, this.barsContainer);
    document.body.appendChild(this.root);
  }

  update(snapshot: CrowdSnapshotSummary): void {
    this.title.textContent = `CROWD VOTE — ${snapshot.uniqueParticipants} voting`;
    this.barsContainer.innerHTML = '';

    const entries = Object.entries(snapshot.votes).sort(([, a], [, b]) => b - a);
    const maxVotes = Math.max(1, ...entries.map(([, count]) => count));

    for (const [action, count] of entries) {
      const row = document.createElement('div');
      const isDominant = action === snapshot.dominantAction && count > 0;

      const label = document.createElement('div');
      label.style.cssText = `display:flex;justify-content:space-between;color:${isDominant ? '#ffcf7a' : '#dffcff'};margin-bottom:2px;`;
      label.innerHTML = `<span>${action}</span><span>${count}</span>`;

      const barTrack = document.createElement('div');
      barTrack.style.cssText = 'height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;';

      const barFill = document.createElement('div');
      const width = (count / maxVotes) * 100;
      barFill.style.cssText = `height:100%;width:${width}%;background:${isDominant ? '#ffcf7a' : '#72ffe7'};`;
      barTrack.appendChild(barFill);

      row.append(label, barTrack);
      this.barsContainer.appendChild(row);
    }
  }
}
