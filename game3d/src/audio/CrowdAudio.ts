import { SOUND_LIBRARY, CrowdSound } from './soundLibrary';
export type { CrowdSound } from './soundLibrary';
type Voice = { source: AudioScheduledSourceNode; nodes: AudioNode[] };

export class CrowdAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private readonly samples = new Map<CrowdSound, AudioBuffer>();
  private readonly downloads = new Map<CrowdSound, Promise<ArrayBuffer>>();
  private loading?: Promise<void>;
  private loadFailed = false;
  private destroyed = false;
  private readonly voices: Voice[] = [];
  private muted = false;
  private resuming?: Promise<void>;
  private previewPending = false;
  private unavailable = false;
  private readonly button = document.createElement('button');

  constructor() {
    this.updateButton();
    this.button.style.cssText = 'position:absolute;top:12px;left:12px;z-index:25;padding:8px 12px;border:1px solid #72ffe7;border-radius:6px;background:rgba(3,7,19,.85);color:#dffcff;font:700 11px monospace;cursor:pointer;';
    this.button.addEventListener('click', () => {
      if (!this.muted && this.context?.state === 'running' && !this.loadFailed && this.samples.size > 0) {
        this.muted = true;
        this.stop();
      } else {
        this.muted = false;
        this.unlock(true);
      }
      this.updateVolume();
      this.updateButton();
    });
    document.body.appendChild(this.button);
    window.addEventListener('pointerdown', this.onGesture, true);
    window.addEventListener('keydown', this.onGesture, true);
  }

  private readonly onGesture = (event: Event): void => {
    if (event.target !== this.button && !this.muted && this.context?.state !== 'running') this.unlock();
  };

  unlock(preview = false): void {
    if (this.muted || this.unavailable || this.destroyed) return;
    this.previewPending ||= preview;
    try {
      if (!this.context) {
        const AudioContextClass = globalThis.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) throw new Error('Web Audio unavailable');
        this.context = new AudioContextClass();
        this.context.onstatechange = () => this.updateButton();
        this.master = this.context.createGain();
        this.updateVolume();
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -15;
        limiter.ratio.value = 8;
        this.master.connect(limiter);
        limiter.connect(this.context.destination);
      }
      void this.loadSamples();
      if (this.context.state === 'running') {
        this.confirmReady();
      } else if (!this.resuming) {
        this.resuming = this.context.resume()
          .then(() => this.confirmReady())
          .catch(() => { this.previewPending = false; this.updateButton(); })
          .finally(() => { this.resuming = undefined; });
      }
    } catch {
      this.unavailable = true;
      this.updateButton();
    }
  }

  private confirmReady(): void {
    this.updateButton();
    if (this.previewPending && this.context?.state === 'running' && this.samples.has('ready')) {
      this.previewPending = false;
      this.play('ready');
    }
  }

  private updateVolume(): void {
    if (this.master && this.context) this.master.gain.setValueAtTime(this.muted ? 0 : 0.6, this.context.currentTime);
  }

  private updateButton(): void {
    const running = this.context?.state === 'running';
    this.button.textContent = this.unavailable ? 'SOUND UNAVAILABLE' : this.muted ? 'SOUND OFF' : this.loadFailed ? 'RETRY SOUND' : running ? (this.samples.size ? 'SOUND ON' : 'LOADING SOUND…') : 'ENABLE SOUND';
    this.button.setAttribute('aria-label', this.muted || !running ? 'Enable sound and play preview' : 'Mute sound');
    this.button.setAttribute('aria-pressed', String(this.muted));
    this.button.disabled = this.unavailable;
  }

  async preload(): Promise<void> {
    await Promise.allSettled((Object.keys(SOUND_LIBRARY) as CrowdSound[]).map(cue => this.download(cue)));
  }

  private download(cue: CrowdSound): Promise<ArrayBuffer> {
    let request = this.downloads.get(cue);
    if (!request) {
      request = fetch(`/audio/${SOUND_LIBRARY[cue].file}`, { signal: AbortSignal.timeout(10_000) })
        .then(response => {
          if (!response.ok) throw new Error(`Audio download failed: ${cue} (${response.status})`);
          return response.arrayBuffer();
        }).catch(error => { this.downloads.delete(cue); throw error; });
      this.downloads.set(cue, request);
    }
    return request;
  }

  private loadSamples(): Promise<void> {
    if (this.loading) return this.loading;
    const context = this.context!;
    this.loadFailed = false;
    this.loading = Promise.allSettled((Object.keys(SOUND_LIBRARY) as CrowdSound[]).map(async cue => {
      if (this.samples.has(cue)) return;
      const bytes = await this.download(cue);
      const buffer = await context.decodeAudioData(bytes.slice(0));
      if (!this.destroyed) this.samples.set(cue, buffer);
    })).then(results => {
      this.loadFailed = results.some(result => result.status === 'rejected');
      if (this.loadFailed) console.warn('[audio] Some sound files could not load. Use RETRY SOUND to retry.');
      if (!this.destroyed) this.confirmReady();
    }).finally(() => { this.loading = undefined; });
    return this.loading;
  }

  play(cue: CrowdSound): void {
    if (!this.context || this.context.state !== 'running' || this.muted || this.destroyed) return;
    const buffer = this.samples.get(cue);
    if (!buffer) return;
    const { volume, rate } = SOUND_LIBRARY[cue];
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = this.context.createGain();
    const start = this.context.currentTime;
    const end = start + buffer.duration / rate;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.005);
    gain.gain.setValueAtTime(volume, Math.max(start + 0.005, end - 0.04));
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain);
    gain.connect(this.master!);
    if (this.voices.length >= 16) {
      const oldest = this.voices[0];
      oldest.source.onended = null;
      oldest.source.stop();
      this.release(oldest);
    }
    const voice: Voice = { source, nodes: [gain] };
    this.voices.push(voice);
    source.onended = () => this.release(voice);
    source.start(start);
    source.stop(end + 0.01);
  }

  stop(): void {
    this.previewPending = false;
    for (const voice of [...this.voices]) {
      voice.source.onended = null;
      voice.source.stop();
      this.release(voice);
    }
  }

  destroy(): void {
    this.destroyed = true;
    window.removeEventListener('pointerdown', this.onGesture, true);
    window.removeEventListener('keydown', this.onGesture, true);
    this.stop();
    this.button.remove();
    this.samples.clear();
    this.downloads.clear();
    void this.context?.close().catch(() => {});
  }

  private release(voice: Voice): void {
    voice.source.disconnect();
    voice.nodes.forEach(node => node.disconnect());
    const index = this.voices.indexOf(voice);
    if (index >= 0) this.voices.splice(index, 1);
  }
}
