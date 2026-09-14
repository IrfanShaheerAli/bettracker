export type Role = "admin" | "participant";
 
export type User = {
  id: string;
  username: string;
  password: string; // mock only — real backend will hash this
  role: Role;
  name: string;
};
 
export type MatchStatus = "upcoming" | "live" | "completed";
 
export type Match = {
  id: string;
  tournamentId: string;
  teamA: string;
  teamB: string;
  kickoff: string; // ISO string
  oddsA: number;
  oddsDraw: number;
  oddsB: number;
  bettingOpen: boolean;
  status: MatchStatus;
  result?: "A" | "draw" | "B";
};
 
export type Tournament = {
  id: string;
  name: string;
  status: "upcoming" | "active" | "completed";
  participantIds: string[];
};
 
export type BetChoice = "A" | "draw" | "B";
 
export type Bet = {
  id: string;
  userId: string;
  matchId: string;
  choice: BetChoice;
  oddsAtBet: number;
  placedAt: string;
};
 
export type Penalty = {
  id: string;
  userId: string;
  matchId: string;
  tournamentId: string;
  reason: string;
};