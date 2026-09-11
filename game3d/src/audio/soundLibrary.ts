export const SOUND_LIBRARY = {
  ready: { file: 'ready.wav', volume: 0.28, rate: 1 },
  charge: { file: 'charge.wav', volume: 0.3, rate: 1 },
  lightning: { file: 'lightning.wav', volume: 0.85, rate: 1 },
  heal: { file: 'heal.wav', volume: 0.55, rate: 1 },
  storm: { file: 'storm.wav', volume: 0.8, rate: 1 },
  spawn: { file: 'zombie.wav', volume: 0.65, rate: 0.94 },
  boss: { file: 'boss.wav', volume: 0.9, rate: 0.82 },
  frost: { file: 'frost.wav', volume: 0.7, rate: 1 },
  fire: { file: 'fire.wav', volume: 0.75, rate: 1 },
  beam: { file: 'beam.wav', volume: 0.6, rate: 1 },
  snare: { file: 'snare.wav', volume: 0.55, rate: 0.9 },
  nova: { file: 'nova.wav', volume: 0.85, rate: 0.9 }
} as const;

export type CrowdSound = keyof typeof SOUND_LIBRARY;
