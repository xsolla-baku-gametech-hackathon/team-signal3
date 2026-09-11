import { CrowdAction } from '../types/events.js';

const COMMAND_ALIASES: Record<string, CrowdAction> = {
  lightning: 'LIGHTNING',
  bolt: 'LIGHTNING',
  heal: 'HEAL',
  health: 'HEAL',
  storm: 'STORM',
  boss: 'BOSS',
  zombie: 'SPAWN_ZOMBIE',
  zombies: 'SPAWN_ZOMBIE',
  spawnzombie: 'SPAWN_ZOMBIE'
};

export function parseTwitchCommand(message: string): CrowdAction | undefined {
  const firstWord = message.trim().split(/\s+/)[0]?.toLowerCase();

  if (!firstWord) {
    return undefined;
  }

  const command = firstWord.startsWith('!') ? firstWord.slice(1) : firstWord;
  return COMMAND_ALIASES[command];
}
