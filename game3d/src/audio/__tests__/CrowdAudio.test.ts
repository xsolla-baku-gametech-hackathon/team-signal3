import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrowdAudio, CrowdSound } from '../CrowdAudio';

function param() { return { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }; }
function node() { return { connect: vi.fn(), disconnect: vi.fn(), gain: param(), frequency: param(), threshold: param(), ratio: param(), playbackRate: param(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null }; }
let contexts: FakeAudioContext[];
class FakeAudioContext {
  state = 'running'; currentTime = 0; sampleRate = 100;
  destination = node(); sources: ReturnType<typeof node>[] = [];
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  constructor() { contexts.push(this); }
  createGain = node;
  createDynamicsCompressor = node;
  createBiquadFilter = node;
  createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
  createOscillator() { const source = node(); this.sources.push(source); return source; }
  createBufferSource() { return this.createOscillator(); }
  decodeAudioData(_bytes: ArrayBuffer) { return Promise.resolve({ duration: 0.5 }); }
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  contexts = [];
  document.body.innerHTML = '';
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('crowd audio', () => {
  it('does not create audio before a gesture and plays all cues after unlock', async () => {
    const audio = new CrowdAudio();
    audio.play('boss');
    expect(contexts).toHaveLength(0);
    audio.unlock();
    await flush();
    for (const cue of ['charge', 'heal', 'lightning', 'storm', 'spawn', 'boss', 'ready', 'frost', 'fire', 'beam', 'snare', 'nova'] as CrowdSound[]) audio.play(cue);
    expect(contexts).toHaveLength(1);
    expect(contexts[0].sources.length).toBeGreaterThan(6);
    expect(contexts[0].sources.every(source => source.start.mock.calls.length === 1 && source.stop.mock.calls.length >= 1)).toBe(true);
    audio.destroy();
  });

  it('caps active voices, stops on mute and ignores cues while muted', async () => {
    const audio = new CrowdAudio();
    audio.unlock();
    await flush();
    for (let i = 0; i < 30; i++) audio.play('boss');
    const sources = contexts[0].sources;
    expect(sources.filter(source => source.onended !== null)).toHaveLength(16);
    document.querySelector('button')!.click();
    expect(sources.every(source => source.onended === null)).toBe(true);
    const count = sources.length;
    audio.play('lightning');
    expect(sources).toHaveLength(count);
    expect(document.querySelector('button')!.getAttribute('aria-pressed')).toBe('true');
    audio.destroy();
  });

  it('shows enable until resume completes, then plays the requested confirmation', async () => {
    const audio = new CrowdAudio();
    expect(document.querySelector('button')!.textContent).toBe('ENABLE SOUND');
    audio.unlock();
    await flush();
    const context = contexts[0];
    context.state = 'suspended';
    let resume!: () => void;
    context.resume.mockImplementation(() => new Promise<void>(resolve => { resume = () => { context.state = 'running'; resolve(); }; }));
    audio.unlock(true);
    expect(context.sources).toHaveLength(0);
    resume();
    await Promise.resolve();
    expect(document.querySelector('button')!.textContent).toBe('SOUND ON');
    expect(context.sources).toHaveLength(1);
    audio.destroy();
  });

  it('retries blocked audio on a later keyboard gesture without overriding mute', async () => {
    const audio = new CrowdAudio();
    audio.unlock();
    await flush();
    const context = contexts[0];
    context.state = 'suspended';
    context.resume.mockRejectedValueOnce(new Error('blocked'));
    audio.unlock();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector('button')!.textContent).toBe('ENABLE SOUND');
    context.resume.mockImplementation(async () => { context.state = 'running'; });
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    await Promise.resolve();
    expect(document.querySelector('button')!.textContent).toBe('SOUND ON');
    document.querySelector('button')!.click();
    context.state = 'suspended';
    context.resume.mockClear();
    window.dispatchEvent(new Event('pointerdown'));
    expect(context.resume).not.toHaveBeenCalled();
    audio.destroy();
  });

  it('does not play a delayed start tone after the round stops', async () => {
    const audio = new CrowdAudio();
    audio.unlock();
    const context = contexts[0];
    context.state = 'suspended';
    let resume!: () => void;
    context.resume.mockImplementation(() => new Promise<void>(resolve => { resume = () => { context.state = 'running'; resolve(); }; }));
    audio.unlock(true);
    audio.stop();
    resume();
    await Promise.resolve();
    expect(context.sources).toHaveLength(0);
    audio.destroy();
  });

  it('keeps gameplay usable when Web Audio is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    const audio = new CrowdAudio();
    expect(() => { audio.unlock(); audio.play('heal'); audio.stop(); }).not.toThrow();
    expect(document.querySelector('button')!.textContent).toBe('SOUND UNAVAILABLE');
    audio.destroy();
  });
});
