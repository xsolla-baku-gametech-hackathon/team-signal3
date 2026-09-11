import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoundHUD, formatRoundTime } from '../RoundHUD';

beforeEach(() => { document.body.innerHTML = ''; });

describe('round presentation', () => {
  it('requires assets before start and presents victory with a working replay button', () => {
    const start = vi.fn();
    const replay = vi.fn();
    const hud = new RoundHUD(start, replay);
    const button = document.querySelector('button')!;
    expect(button.disabled).toBe(true);
    hud.setReady();
    button.click();
    expect(start).toHaveBeenCalledOnce();
    hud.update({ phase: 'RUNNING', remainingMs: 180_000, elapsedMs: 0, wave: 1 }, 0, 0);
    expect(document.querySelector('section')!.style.display).toBe('none');
    hud.update({ phase: 'WON', remainingMs: 0, elapsedMs: 180_000, wave: 6 }, 12, 9);
    expect(document.body.textContent).toContain('YOU SURVIVED');
    expect(document.body.textContent).toContain('Enemies defeated: 12');
    expect(document.body.textContent).toContain('Crowd events: 9');
    button.click();
    expect(replay).toHaveBeenCalledOnce();
  });

  it('shows final-stand countdown and a persistent defeat result', () => {
    const hud = new RoundHUD(vi.fn(), vi.fn());
    hud.setReady();
    hud.update({ phase: 'RUNNING', remainingMs: 30_000, elapsedMs: 150_000, wave: 6 }, 0, 0);
    expect(document.querySelector('[role="timer"]')!.textContent).toBe('FINAL STAND · 0:30');
    hud.update({ phase: 'LOST', remainingMs: 25_000, elapsedMs: 155_000, wave: 6 }, 3, 2);
    expect(document.body.textContent).toContain('YOU FELL');
    expect(document.body.textContent).toContain('Survived 2:35 / 3:00');
  });

  it('offers reload after required assets fail', () => {
    const reload = vi.fn();
    const hud = new RoundHUD(vi.fn(), reload);
    hud.showLoadError();
    document.querySelector('button')!.click();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not show zero before the round actually finishes', () => {
    expect(formatRoundTime(1)).toBe('0:01');
    expect(formatRoundTime(180_000)).toBe('3:00');
    expect(formatRoundTime(-1)).toBe('0:00');
  });
});
