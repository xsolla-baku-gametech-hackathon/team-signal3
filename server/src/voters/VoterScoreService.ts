export type VoterTier = 1 | 2 | 3;

export type VoterStatus = {
  voterId: string;
  nickname?: string;
  dp: number;
  tier: VoterTier;
  tierLabel: string;
  voteWeight: number;
  tierStartDp: number;
  nextTierAt?: number;
};

const TIER_THRESHOLDS: ReadonlyArray<{ tier: VoterTier; label: string; weight: number; minDp: number }> = [
  { tier: 3, label: 'Master Director', weight: 2, minDp: 501 },
  { tier: 2, label: 'Tactical Director', weight: 1.5, minDp: 101 },
  { tier: 1, label: 'Novice Director', weight: 1, minDp: 0 }
];

const ACTIVITY_POINTS = 5;
const ALIGNED_WITH_CROWD_POINTS = 10;
const SHOW_SAVED_POINTS = 25;
const CRITICAL_HP_THRESHOLD = 20;

export class VoterScoreService {
  private readonly dpByRoom = new Map<string, Map<string, number>>();
  private readonly nicknamesByRoom = new Map<string, Map<string, string>>();

  getWeight(roomId: string, voterId: string): number {
    return this.getStatus(roomId, voterId).voteWeight;
  }

  setNickname(roomId: string, voterId: string, nickname: string): void {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    this.getOrCreateNicknameMap(roomId).set(voterId, trimmed);
  }

  getStatus(roomId: string, voterId: string): VoterStatus {
    const dp = this.getDp(roomId, voterId);
    return this.statusFor(roomId, voterId, dp);
  }

  getLeaderboard(roomId: string): VoterStatus[] {
    const room = this.dpByRoom.get(roomId);
    if (!room) return [];
    return [...room.entries()]
      .map(([voterId, dp]) => this.statusFor(roomId, voterId, dp))
      .sort((a, b) => b.dp - a.dp);
  }

  scoreVote(
    roomId: string,
    voterId: string,
    chosenAction: string,
    dominantAction: string,
    hpBeforeDecision: number
  ): VoterStatus {
    let points = ACTIVITY_POINTS;
    if (chosenAction === dominantAction) points += ALIGNED_WITH_CROWD_POINTS;
    const isSafeChoice = chosenAction === 'HEAL' || chosenAction === 'LIGHTNING' || chosenAction === 'STORM';
    if (hpBeforeDecision < CRITICAL_HP_THRESHOLD && isSafeChoice) points += SHOW_SAVED_POINTS;

    const room = this.getOrCreateRoomMap(roomId);
    const nextDp = (room.get(voterId) ?? 0) + points;
    room.set(voterId, nextDp);

    return this.getStatus(roomId, voterId);
  }

  private getDp(roomId: string, voterId: string): number {
    return this.dpByRoom.get(roomId)?.get(voterId) ?? 0;
  }

  private getOrCreateRoomMap(roomId: string): Map<string, number> {
    const existing = this.dpByRoom.get(roomId);
    if (existing) return existing;
    const created = new Map<string, number>();
    this.dpByRoom.set(roomId, created);
    return created;
  }

  private getOrCreateNicknameMap(roomId: string): Map<string, string> {
    const existing = this.nicknamesByRoom.get(roomId);
    if (existing) return existing;
    const created = new Map<string, string>();
    this.nicknamesByRoom.set(roomId, created);
    return created;
  }

  private statusFor(roomId: string, voterId: string, dp: number): VoterStatus {
    const index = TIER_THRESHOLDS.findIndex((entry) => dp >= entry.minDp);
    const current = index >= 0 ? TIER_THRESHOLDS[index] : TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1];
    const next = index > 0 ? TIER_THRESHOLDS[index - 1] : undefined;

    return {
      voterId,
      nickname: this.nicknamesByRoom.get(roomId)?.get(voterId),
      dp,
      tier: current.tier,
      tierLabel: current.label,
      voteWeight: current.weight,
      tierStartDp: current.minDp,
      nextTierAt: next?.minDp
    };
  }
}
