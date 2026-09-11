import { AbilityDefinition } from './AbilitySystem';
import { spawnBeam } from '../vfx/effects/BeamEffect';
import { spawnFireball } from '../vfx/effects/FireballEffect';
import { spawnFrostNova } from '../vfx/effects/FrostNovaEffect';
import { spawnNova } from '../vfx/effects/NovaEffect';
import { spawnSnare } from '../vfx/effects/SnareEffect';
import { strikeLightningAt } from '../GameEventHandler';

export const ABILITY_DEFINITIONS: AbilityDefinition[] = [
  {
    key: 'Q',
    label: 'LIGHTNING',
    icon: '⚡',
    cooldownMs: 2500,
    cast: ({ scene, aimPoint, playerPosition, enemySystem }) => {
      strikeLightningAt(scene, aimPoint ?? playerPosition, enemySystem);
    }
  },
  {
    key: 'E',
    label: 'FROST NOVA',
    icon: '❄️',
    cooldownMs: 2500,
    cast: ({ scene, aimPoint, playerPosition, enemySystem }) => {
      const point = aimPoint ?? playerPosition;
      spawnFrostNova(scene, point, 3);
      enemySystem?.damageInRadius(point, 3, 25, { multiplier: 0.4, durationMs: 2500 });
    }
  },
  {
    key: 'R',
    label: 'FIREBALL',
    icon: '🔥',
    cooldownMs: 2500,
    cast: ({ scene, aimPoint, playerPosition, enemySystem }) => {
      const point = aimPoint ?? playerPosition;
      spawnFireball(scene, playerPosition, point, () => {
        enemySystem?.damageInRadius(point, 3, 50);
      });
    }
  },
  {
    key: 'F',
    label: 'BEAM',
    icon: '🔮',
    cooldownMs: 2500,
    cast: ({ scene, playerPosition, aimDirection, enemySystem }) => {
      const length = 12;
      const halfWidth = 1;
      spawnBeam(scene, playerPosition, aimDirection, length, halfWidth);
      enemySystem?.damageInCone(playerPosition, aimDirection, length, halfWidth, 30);
    }
  },
  {
    key: 'V',
    label: 'SNARE',
    icon: '🕸️',
    cooldownMs: 2500,
    cast: ({ scene, aimPoint, playerPosition, enemySystem }) => {
      const point = aimPoint ?? playerPosition;
      spawnSnare(scene, point, 3.5);
      enemySystem?.damageInRadius(point, 3.5, 20, { multiplier: 0.3, durationMs: 3000 });
    }
  },
  {
    key: 'X',
    label: 'GLACIAL CROWN',
    icon: '👑',
    cooldownMs: 2500,
    cast: ({ scene, playerPosition, enemySystem }) => {
      spawnNova(scene, playerPosition, 6);
      enemySystem?.damageInRadius(playerPosition, 6, 60);
    }
  }
];
