"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSession } from "@/lib/session";
import { User } from "@/types";

type ApiParticipant = { _id: string; name: string };
type ApiTournament = { _id: string; name: string; participantIds: ApiParticipant[] };
type ApiMatch = { _id: string; teamA: string; teamB: string; result?: "A" | "draw" | "B" | null };
type ApiBet = {
  userId: { _id: string };
  choice: "A" | "draw" | "B";
  stake: number;
  dividend: number | null;
};
type ApiPenalty = { userId: { _id: string }; amount: number };

// value is always the NET profit/loss — used for ranking totals.
// stake is kept alongside it only so the display can show the full payout
// (stake + profit) for a win, without changing what counts toward the total.
type Cell = { kind: "none" | "pending" | "penalty" | "settled"; value?: number; stake?: number };

export default function TournamentLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [tournament, setTournament] = useState<ApiTournament | null>(null);
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  // grid[matchId][userId] = Cell
  const [grid, setGrid] = useState<Record<string, Record<string, Cell>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUser(session);

    async function load() {
      const tRes = await fetch(`/api/tournaments/${tournamentId}`);
      const tData: ApiTournament = await tRes.json();

      if (session!.role !== "admin" && !tData.participantIds.some((p) => p._id === session!.id)) {
        router.replace("/tournaments");
        return;
      }
      setTournament(tData);

      const mRes = await fetch(`/api/tournaments/${tournamentId}/matches`);
      const mData: ApiMatch[] = await mRes.json();
      setMatches(mData);

      const newGrid: Record<string, Record<string, Cell>> = {};

      await Promise.all(
        mData.map(async (m) => {
          const [betsRes, matchRes] = await Promise.all([
            fetch(`/api/matches/${m._id}/bets`),
            fetch(`/api/matches/${m._id}`),
          ]);
          const bets: ApiBet[] = await betsRes.json();
          const matchDetail: { penalties: ApiPenalty[] } = await matchRes.json();

          newGrid[m._id] = {};

          for (const bet of bets) {
            const uid = bet.userId._id;
            if (bet.dividend !== null) {
              newGrid[m._id][uid] = { kind: "settled", value: bet.dividend, stake: bet.stake };
            } else {
              newGrid[m._id][uid] = { kind: "pending" };
            }
          }

          for (const pen of matchDetail.penalties) {
            const uid = pen.userId._id;
            newGrid[m._id][uid] = { kind: "penalty", value: -pen.amount };
          }
        })
      );

      setGrid(newGrid);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, tournamentId]);

  if (!user || !tournament || loading) return null;

  function cellFor(matchId: string, userId: string): Cell {
    return grid[matchId]?.[userId] ?? { kind: "none" };
  }

  const rows = tournament.participantIds.map((p) => {
    let total = 0;
    let accuracy = 0; // number of matches this person predicted correctly

    for (const m of matches) {
      const cell = cellFor(m._id, p._id);
      if (cell.kind === "settled") {
        total += cell.value!;
        // a win has a net value of 0 or more; a loss is always -stake
        if (cell.value! >= 0) accuracy++;
      } else if (cell.kind === "penalty") {
        total += cell.value!;
      }
    }

    return { ...p, total, accuracy };
  });

  const ranked = [...rows].sort((a, b) => b.total - a.total);
  const rankOf = (userId: string) => ranked.findIndex((r) => r._id === userId) + 1;

  function renderCell(cell: Cell) {
    if (cell.kind === "none") return <span className="text-gray-700">–</span>;
    if (cell.kind === "pending") return <span className="text-gray-500">Pending</span>;

    const color = (cell.value ?? 0) >= 0 ? "text-green-400" : "text-red-400";

    if (cell.kind === "penalty") {
      return <span className={color}>{cell.value} (pen)</span>;
    }

    // Winning bet: show the full payout (stake back + profit), not just the profit —
    // matches what the person actually receives. A loss still shows the net -stake.
    const isWin = (cell.value ?? 0) >= 0;
    const displayValue = isWin && cell.stake !== undefined ? cell.stake + cell.value! : cell.value!;
    const label = `${displayValue >= 0 ? "+" : ""}${displayValue.toFixed(2)}`;

    return <span className={color}>{label}</span>;
  }

  const isAdmin = user.role === "admin";

  return (
    <>
      <Navbar />

      <main
        className={`relative min-h-screen px-6 py-10 ${
          isAdmin ? "bg-[#071A12]" : "bg-cover bg-center bg-fixed"
        }`}
        style={isAdmin ? undefined : { backgroundImage: "url('/hero-stadium.png')" }}
      >
        {!isAdmin && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04140D]/25 via-[#04140D]/80 to-[#04140D]/25" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#04140D]/70" />
          </>
        )}

        <div className="relative mx-auto max-w-6xl">
          <h1 className="mb-1 text-2xl font-bold text-white">{tournament.name} — Leaderboard</h1>
          <p className="mb-6 text-sm text-gray-400">
            Match-by-match results, calculated live from every settled bet.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-green-900 bg-[#0E231B]/90 backdrop-blur-sm">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-green-900 text-xs text-gray-400">
                  <th className="sticky left-0 bg-[#0E231B] px-4 py-3 text-left">Punter</th>
                  {matches.map((m) => (
                    <th key={m._id} className="whitespace-nowrap px-3 py-3 text-right">
                      {m.teamA} vs {m.teamB}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right">Total winnings/loss</th>
                  <th className="px-3 py-3 text-right">Accuracy</th>
                  <th className="px-3 py-3 text-right">Rank</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-green-900/50 last:border-b-0">
                    <td className="sticky left-0 bg-[#0E231B] px-4 py-3 text-white">
                      {r.name} {r._id === user.id && <span className="text-green-400">(you)</span>}
                    </td>
                    {matches.map((m) => (
                      <td key={m._id} className="px-3 py-3 text-right">
                        {renderCell(cellFor(m._id, r._id))}
                      </td>
                    ))}
                    <td
                      className={`px-3 py-3 text-right font-semibold ${
                        r.total >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {r.total >= 0 ? "+" : ""}
                      {r.total.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-300">
                      {r.accuracy}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-bold ${
                        rankOf(r._id) === 1 ? "text-yellow-400" : "text-gray-400"
                      }`}
                    >
                      #{rankOf(r._id)}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={matches.length + 4} className="px-4 py-6 text-center text-gray-500">
                      No participants in this tournament yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
