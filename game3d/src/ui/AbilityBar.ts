export type AbilitySlotConfig = {
  key: string;
  label: string;
  icon: string; // emoji, kept simple — no icon assets needed
};

type SlotElements = {
  root: HTMLDivElement;
  cooldownOverlay: HTMLDivElement;
};

export class AbilityBar {
  private readonly slots = new Map<string, SlotElements>();

  constructor(abilities: AbilitySlotConfig[]) {
    const bar = document.createElement('div');
    bar.style.cssText = [
      'position:absolute',
      'bottom:16px',
      'left:50%',
      'transform:translateX(-50%)',
      'display:flex',
      'gap:10px',
      'pointer-events:none'
    ].join(';');

    for (const ability of abilities) {
      const root = document.createElement('div');
      root.style.cssText = [
        'position:relative',
        'width:76px',
        'height:76px',
        'border-radius:10px',
        'background:rgba(6,10,20,0.85)',
        'border:2px solid rgba(114,255,231,0.35)',
        'overflow:hidden',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'justify-content:center',
        'color:#dffcff',
        'font:700 10px monospace',
        'text-align:center'
      ].join(';');

      const icon = document.createElement('div');
      icon.textContent = ability.icon;
      icon.style.cssText = 'font-size:22px;line-height:1;margin-bottom:4px;';

      const label = document.createElement('div');
      label.textContent = ability.label;
      label.style.cssText = 'letter-spacing:0.03em;padding:0 4px;';

      const keyBadge = document.createElement('div');
      keyBadge.textContent = ability.key;
      keyBadge.style.cssText = [
        'position:absolute',
        'top:3px',
        'right:5px',
        'font-size:10px',
        'opacity:0.6'
      ].join(';');

      const cooldownOverlay = document.createElement('div');
      cooldownOverlay.style.cssText = [
        'position:absolute',
        'inset:0',
        'background:rgba(0,0,0,0.72)',
        'transform-origin:bottom',
        'transform:scaleY(0)'
      ].join(';');

      root.append(icon, label, keyBadge, cooldownOverlay);
      bar.appendChild(root);
      this.slots.set(ability.key, { root, cooldownOverlay });
    }

    document.body.appendChild(bar);
  }

  setCooldownFraction(key: string, fraction: number): void {
    const slot = this.slots.get(key);

    if (!slot) {
      return;
    }

    const clamped = Math.max(0, Math.min(1, fraction));
    slot.cooldownOverlay.style.transform = `scaleY(${clamped})`;
    slot.root.style.borderColor = clamped > 0 ? 'rgba(114,255,231,0.35)' : 'rgba(255,159,10,0.9)';
  }
}
