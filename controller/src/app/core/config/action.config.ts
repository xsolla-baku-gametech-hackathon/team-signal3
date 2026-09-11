import { CrowdAction } from '../models/socket.models';

export type ActionSide = 'HELP' | 'HINDER';

export type ActionConfig = {
  type: CrowdAction;
  label: string;
  description: string;
  icon: string;
  cooldownMs: number;
  tone: 'cyan' | 'magenta' | 'amber' | 'violet' | 'gold';
  side: ActionSide;
  vipOnly?: boolean;
};

export const ACTIONS: readonly ActionConfig[] = [
  {
    type: 'HEAL',
    label: 'Heal',
    description: 'Save the player',
    icon: 'pi pi-heart',
    cooldownMs: 1400,
    tone: 'cyan',
    side: 'HELP'
  },
  {
    type: 'LIGHTNING',
    label: 'Lightning',
    description: 'Smite the horde',
    icon: 'pi pi-bolt',
    cooldownMs: 1800,
    tone: 'amber',
    side: 'HELP'
  },
  {
    type: 'STORM',
    label: 'Storm',
    description: 'Clear the field',
    icon: 'pi pi-sparkles',
    cooldownMs: 2200,
    tone: 'violet',
    side: 'HELP'
  },
  {
    type: 'SPAWN_ZOMBIE',
    label: 'Spawn Zombie',
    description: 'Send more danger',
    icon: 'pi pi-send',
    cooldownMs: 900,
    tone: 'magenta',
    side: 'HINDER'
  },
  {
    type: 'BOSS',
    label: 'Boss',
    description: 'Unleash a boss',
    icon: 'pi pi-exclamation-triangle',
    cooldownMs: 3500,
    tone: 'magenta',
    side: 'HINDER'
  },
  {
    type: 'VIP_SHIELD',
    label: 'Shield Airdrop',
    description: 'Master Director privilege — guaranteed rescue',
    icon: 'pi pi-crown',
    cooldownMs: 6000,
    tone: 'gold',
    side: 'HELP',
    vipOnly: true
  }
];
