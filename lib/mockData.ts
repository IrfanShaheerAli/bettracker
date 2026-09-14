import { User, Tournament, Match, Bet, Penalty } from "@/types";

export const mockUsers: User[] = [
  { id: "u-admin", username: "admin", password: "admin123", role: "admin", name: "Admin" },
  { id: "u-1", username: "irfan", password: "pass123", role: "participant", name: "Irfan" },
  { id: "u-2", username: "sam", password: "pass123", role: "participant", name: "Sam" },
  { id: "u-3", username: "zoya", password: "pass123", role: "participant", name: "Zoya" },
];

export const mockTournaments: Tournament[] = [
  {
    id: "t-1",
    name: "Champions League — Group Stage",
    status: "active",
    participantIds: ["u-1", "u-2"],
  },
  {
    id: "t-2",
    name: "Premier League — Matchweek 12",
    status: "upcoming",
    participantIds: [],
  },
];

export const mockMatches: Match[] = [
  {
    id: "m-1",
    tournamentId: "t-1",
    teamA: "Real Madrid",
    teamB: "Bayern Munich",
    kickoff: "2026-08-14T19:00:00Z",
    oddsA: 1.95,
    oddsDraw: 3.4,
    oddsB: 2.1,
    bettingOpen: true,
    status: "upcoming",
  },
  {
    id: "m-2",
    tournamentId: "t-1",
    teamA: "PSG",
    teamB: "Man City",
    kickoff: "2026-08-15T19:00:00Z",
    oddsA: 2.2,
    oddsDraw: 3.3,
    oddsB: 1.85,
    bettingOpen: false,
    status: "upcoming",
  },
];

export const mockBets: Bet[] = [];
export const mockPenalties: Penalty[] = [];

// Placeholder standings until real bet results are tracked in a shared store.
// netWinnings = total won from correct bets minus total staked on incorrect ones (can be negative).
export const mockStandings = [
  { userId: "u-1", netWinnings: 145.5, betsPlaced: 8 },
  { userId: "u-2", netWinnings: -32.0, betsPlaced: 6 },
  { userId: "u-3", netWinnings: 78.25, betsPlaced: 4 },
];
