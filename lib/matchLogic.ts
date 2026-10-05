import Match from "@/models/Match";
import Bet from "@/models/Bet";
import Tournament from "@/models/Tournament";
import Penalty from "@/models/Penalty";

// Fixed penalty amount for missing a bet on a joined tournament's match.
// Adjust this if your group wants a different amount.
export const PENALTY_AMOUNT = 50;

type MatchLike = { kickoff: Date | string; bettingOpen: boolean };
type TournamentLike = { bettingCutoffHours?: number };

// The real moment betting should close for a match: some number of hours
// (configurable per tournament) before kickoff.
export function getCutoffTime(match: MatchLike, tournament: TournamentLike): Date {
  const cutoffHours = tournament.bettingCutoffHours ?? 2;
  const kickoff = new Date(match.kickoff);
  return new Date(kickoff.getTime() - cutoffHours * 60 * 60 * 1000);
}

export function isCutoffPassed(match: MatchLike, tournament: TournamentLike): boolean {
  return new Date() >= getCutoffTime(match, tournament);
}

// True betting status factoring in both the admin's manual toggle AND the
// automatic time-based cutoff — whichever closes it first wins.
export function isEffectivelyOpen(match: MatchLike, tournament: TournamentLike): boolean {
  return match.bettingOpen && !isCutoffPassed(match, tournament);
}

// Runs the same penalty logic whether betting closed manually (admin clicked
// the toggle) or automatically (the cutoff time was reached). Safe to call
// more than once — it never double-penalizes the same person for the same match.
export async function penalizeNoShows(matchId: string, tournamentId: string) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return;

  const bets = await Bet.find({ matchId });
  const betUserIds = new Set(bets.map((b) => String(b.userId)));

  for (const participantId of tournament.participantIds) {
    const idStr = String(participantId);
    if (betUserIds.has(idStr)) continue;

    const alreadyPenalized = await Penalty.findOne({ userId: idStr, matchId });
    if (alreadyPenalized) continue;

    await Penalty.create({
      userId: idStr,
      matchId,
      tournamentId,
      amount: PENALTY_AMOUNT,
      reason: "Missed betting on a joined tournament's match",
    });
  }
}

// Call this whenever a match is read. If its cutoff has just passed and the
// admin never manually closed it, this persists bettingOpen=false and runs
// the penalty check — so auto-close behaves exactly like a manual close.
export async function syncAutoClose(match: InstanceType<typeof Match>) {
  const tournament = await Tournament.findById(match.tournamentId);
  if (!tournament) return match;

  if (match.bettingOpen && isCutoffPassed(match, tournament)) {
    match.bettingOpen = false;
    await match.save();
    await penalizeNoShows(String(match._id), String(match.tournamentId));
  }

  return match;
}

export function computePools(bets: { choice: string; stake: number }[]) {
  const pools = { A: 0, draw: 0, B: 0 };
  for (const b of bets) pools[b.choice as "A" | "draw" | "B"] += b.stake;
  const total = pools.A + pools.draw + pools.B;
  const oddsFor = (pool: number) => (pool > 0 ? Number(((total - pool) / pool).toFixed(2)) : null);
  return { pools, odds: { A: oddsFor(pools.A), draw: oddsFor(pools.draw), B: oddsFor(pools.B) } };
}
