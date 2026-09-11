import { describe, expect, it } from 'vitest';
import { VoterScoreService } from '../VoterScoreService.js';

describe('VoterScoreService', () => {
  it('starts every voter as a Novice Director with 1x weight', () => {
    const service = new VoterScoreService();
    expect(service.getStatus('DEMO-123', 'v1')).toEqual({
      voterId: 'v1',
      dp: 0,
      tier: 1,
      tierLabel: 'Novice Director',
      voteWeight: 1,
      tierStartDp: 0,
      nextTierAt: 101
    });
  });

  it('awards activity plus alignment points and keeps rooms independent', () => {
    const service = new VoterScoreService();
    const status = service.scoreVote('DEMO-123', 'v1', 'LIGHTNING', 'LIGHTNING', 80);
    expect(status.dp).toBe(15);
    expect(service.getStatus('OTHER-123', 'v1').dp).toBe(0);
  });

  it('gives the show-saved bonus only for a safe pick while HP is critical', () => {
    const service = new VoterScoreService();
    const savedTheShow = service.scoreVote('DEMO-123', 'v1', 'HEAL', 'HEAL', 15);
    expect(savedTheShow.dp).toBe(40);

    const wentForTheKill = service.scoreVote('DEMO-123', 'v2', 'BOSS', 'BOSS', 15);
    expect(wentForTheKill.dp).toBe(15);

    const safeButNotCritical = service.scoreVote('DEMO-123', 'v3', 'HEAL', 'HEAL', 80);
    expect(safeButNotCritical.dp).toBe(15); // HP not critical, no bonus
  });

  it('promotes a voter through tiers as Director Points accumulate', () => {
    const service = new VoterScoreService();
    for (let i = 0; i < 7; i++) service.scoreVote('DEMO-123', 'v1', 'HEAL', 'HEAL', 15);
    const tactical = service.getStatus('DEMO-123', 'v1');
    expect(tactical.tier).toBe(2);
    expect(tactical.tierLabel).toBe('Tactical Director');
    expect(tactical.voteWeight).toBe(1.5);

    for (let i = 0; i < 6; i++) service.scoreVote('DEMO-123', 'v1', 'HEAL', 'HEAL', 15);
    const master = service.getStatus('DEMO-123', 'v1');
    expect(master.tier).toBe(3);
    expect(master.tierLabel).toBe('Master Director');
    expect(master.voteWeight).toBe(2);
    expect(master.nextTierAt).toBeUndefined(); // already at the top tier
  });

  it('ranks the leaderboard by DP, highest first', () => {
    const service = new VoterScoreService();
    service.scoreVote('DEMO-123', 'v1', 'HEAL', 'HEAL', 80);
    service.scoreVote('DEMO-123', 'v2', 'HEAL', 'HEAL', 15);
    service.scoreVote('DEMO-123', 'v3', 'BOSS', 'HEAL', 80);

    expect(service.getLeaderboard('DEMO-123').map((entry) => entry.voterId)).toEqual(['v2', 'v1', 'v3']);
    expect(service.getLeaderboard('OTHER-123')).toEqual([]);
  });

  it('remembers a voter nickname per room and shows it on their status and the leaderboard', () => {
    const service = new VoterScoreService();
    service.setNickname('DEMO-123', 'v1', '  Alice  ');
    service.scoreVote('DEMO-123', 'v1', 'HEAL', 'HEAL', 80);

    expect(service.getStatus('DEMO-123', 'v1').nickname).toBe('Alice');
    expect(service.getLeaderboard('DEMO-123')[0].nickname).toBe('Alice');
    expect(service.getStatus('OTHER-123', 'v1').nickname).toBeUndefined();

    service.setNickname('DEMO-123', 'v1', '   ');
    expect(service.getStatus('DEMO-123', 'v1').nickname).toBe('Alice'); // blank nickname is ignored
  });
});
