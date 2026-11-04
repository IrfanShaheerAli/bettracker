"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSession } from "@/lib/session";
import { downloadWorkbook, type ExportCell } from "@/lib/exportExcel";
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
type SideEntry = { net: number; settled: number; pending: number };

// One cell = one person's result for one match, with everything combined:
//   value    = NET profit/loss from the match bet + all their side bets
//              on that match (+ any penalty). The Total column adds these up.
//   matchWon = true only when their main match prediction was correct.
//              Kept separate so Accuracy still counts match predictions only,
//              not side bets.
type Cell = {
  kind: "none" | "pending" | "penalty" | "settled";
  value?: number;
  matchWon?: boolean;
};

// Fold a person's side bet result into their match bet cell.
function mergeCell(main: Cell, side?: SideEntry): Cell {
  const mainCounts = main.kind === "settled" || main.kind === "penalty";
  const sideCounts = !!side && side.settled > 0;

  if (mainCounts || sideCounts) {
    const net = (mainCounts ? main.value! : 0) + (sideCounts ? side!.net : 0);
    return {
      // still labelled "(pen)" only when the penalty is the whole story
      kind: main.kind === "penalty" && !sideCounts ? "penalty" : "settled",
      value: Math.round(net * 100) / 100,
      matchWon: main.matchWon,
    };
  }

  const anyPending = main.kind === "pending" || (!!side && side.pending > 0);
  return anyPending ? { kind: "pending" } : { kind: "none" };
}

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
  const [exporting, setExporting] = useState(false);

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

      // every person's side bet result per match, fetched in one request
      const sideRes = await fetch(`/api/tournaments/${tournamentId}/sidebet-earnings`);
      const sideEarnings: Record<string, Record<string, SideEntry>> = await sideRes.json();

      await Promise.all(
        mData.map(async (m) => {
          const [betsRes, matchRes] = await Promise.all([
            fetch(`/api/matches/${m._id}/bets`),
            fetch(`/api/matches/${m._id}`),
          ]);
          const bets: ApiBet[] = await betsRes.json();
          const matchDetail: { penalties: ApiPenalty[] } = await matchRes.json();

          // 1. the match bet result on its own
          const mainCells: Record<string, Cell> = {};

          for (const bet of bets) {
            const uid = bet.userId._id;
            if (bet.dividend !== null) {
              // a win has a net value of 0 or more; a loss is always -stake
              mainCells[uid] = { kind: "settled", value: bet.dividend, matchWon: bet.dividend >= 0 };
            } else {
              mainCells[uid] = { kind: "pending" };
            }
          }

          for (const pen of matchDetail.penalties) {
            mainCells[pen.userId._id] = { kind: "penalty", value: -pen.amount };
          }

          // 2. combine it with their side bets on this match, for everyone in the tournament
          newGrid[m._id] = {};
          for (const p of tData.participantIds) {
            newGrid[m._id][p._id] = mergeCell(
              mainCells[p._id] ?? { kind: "none" },
              sideEarnings[m._id]?.[p._id]
            );
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
      // each cell already combines the match bet, side bets and any penalty
      if (cell.kind === "settled" || cell.kind === "penalty") total += cell.value!;
      // Accuracy counts match predictions only, never side bets
      if (cell.matchWon) accuracy++;
    }

    return { ...p, total, accuracy };
  });

  const ranked = [...rows].sort((a, b) => b.total - a.total);
  const rankOf = (userId: string) => ranked.findIndex((r) => r._id === userId) + 1;

  function renderCell(cell: Cell) {
    if (cell.kind === "none") return <span className="text-gray-700">–</span>;
    if (cell.kind === "pending") return <span className="text-gray-500">Pending</span>;

    const value = cell.value ?? 0;
    const color = value >= 0 ? "text-green-400" : "text-red-400";

    if (cell.kind === "penalty") {
      return <span className={color}>{value} (pen)</span>;
    }

    // Net earnings for this match: match bet + side bets combined.
    return (
      <span className={color}>
        {value >= 0 ? "+" : ""}
        {value.toFixed(2)}
      </span>
    );
  }

  const isAdmin = user.role === "admin";

  // Downloads exactly what the table shows as an Excel file.
  async function handleExport() {
    if (!isAdmin) return; // export is admin-only
    const tournamentName = tournament!.name;
    setExporting(true);
    try {
      const toExportCell = (cell: Cell): ExportCell => {
        if (cell.kind === "none") return "–";
        if (cell.kind === "pending") return "Pending";
        const value = cell.value ?? 0;
        if (cell.kind === "penalty") return { text: `${value} (pen)`, tone: "bad" };
        return value;
      };

      await downloadWorkbook({
        fileName: `${tournamentName} - Leaderboard`,
        sheetName: "Leaderboard",
        title: `${tournamentName} — Leaderboard`,
        subtitleLines: [
          `Exported on ${new Date().toLocaleString()}`,
          "Each match column combines the match bet and any side bets. (pen) = penalty for not placing a bet.",
        ],
        headers: [
          "Punter",
          ...matches.map((m) => `${m.teamA} vs ${m.teamB}`),
          "Total winnings/loss",
          "Accuracy",
          "Rank",
        ],
        rows: rows.map((r) => [
          r.name,
          ...matches.map((m) => toExportCell(cellFor(m._id, r._id))),
          Math.round(r.total * 100) / 100,
          r.accuracy,
          rankOf(r._id),
        ]),
        // every match column, plus the Total column, holds money
        moneyColumns: [...matches.map((_, i) => i + 1), matches.length + 1],
      });
    } catch {
      alert("Could not create the Excel file. Please try again.");
    } finally {
      setExporting(false);
    }
  }

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
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-white">{tournament.name} — Leaderboard</h1>
            {isAdmin && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="rounded-lg border border-green-500 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-500/10 disabled:opacity-50"
              >
                {exporting ? "Preparing…" : "Export to Excel"}
              </button>
            )}
          </div>
          <p className="mb-6 text-sm text-gray-400">
            Match-by-match earnings, calculated live. Each match column combines the match bet
            and any side bets on that match.
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
