import { describe, expect, it } from 'vitest';
import { parseTwitchCommand } from '../parseTwitchCommand.js';

describe('parseTwitchCommand', () => {
  it('maps a bare command word to its action', () => {
    expect(parseTwitchCommand('lightning')).toBe('LIGHTNING');
  });

  it('maps a "!"-prefixed command to its action', () => {
    expect(parseTwitchCommand('!lightning')).toBe('LIGHTNING');
  });

  it('is case-insensitive', () => {
    expect(parseTwitchCommand('!LiGhTnInG')).toBe('LIGHTNING');
  });

  it('ignores trailing hype text after the command', () => {
    expect(parseTwitchCommand('!lightning go go go!!')).toBe('LIGHTNING');
  });

  it('supports aliases for the same action', () => {
    expect(parseTwitchCommand('!bolt')).toBe('LIGHTNING');
    expect(parseTwitchCommand('!health')).toBe('HEAL');
    expect(parseTwitchCommand('!zombies')).toBe('SPAWN_ZOMBIE');
  });

  it('returns undefined for ordinary chat that is not a vote', () => {
    expect(parseTwitchCommand('gg that fight was insane')).toBeUndefined();
  });

  it('returns undefined for an empty or whitespace-only message', () => {
    expect(parseTwitchCommand('   ')).toBeUndefined();
    expect(parseTwitchCommand('')).toBeUndefined();
  });
});
