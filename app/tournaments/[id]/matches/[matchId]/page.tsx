"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSession } from "@/lib/session";
import { User } from "@/types";

type ApiMatch = {
  _id: string;
  teamA: string;
  teamB: string;
  kickoff: string;
  result?: "A" | "draw" | "B" | null;
  odds: { A: number | null; draw: number | null; B: number | null };
  penalties: { userId: { _id: string; name: string }; amount: number }[];
  cutoffTime: string | null;
};
type ApiBet = {
  _id: string;
  userId: { _id: string; name: string };
  choice: "A" | "draw" | "B";
  stake: number;
  dividend: number | null;
};

export default function MatchLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [user, setUser] = useState<User | null>(null);
  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [bets, setBets] = useState<ApiBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUser(session);

    async function load() {
      const [mRes, bRes] = await Promise.all([
        fetch(`/api/matches/${matchId}`),
        fetch(`/api/matches/${matchId}/bets`),
      ]);
      setMatch(await mRes.json());
      setBets(await bRes.json());
      setLoading(false);
    }
    load();
  }, [router, matchId]);

  if (!user || !match || loading) return null;

  const isAdmin = user.role === "admin";
  const cutoffPassed = match.cutoffTime ? new Date() >= new Date(match.cutoffTime) : false;

  if (!isAdmin && !cutoffPassed) {
    return (
      <>
        <Navbar />
        <main
          className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-fixed px-6"
          style={{ backgroundImage: "url('/hero-stadium.png')" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04140D]/25 via-[#04140D]/80 to-[#04140D]/25" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#04140D]/70" />

          <div className="relative rounded-2xl border border-green-900 bg-[#0E231B]/90 p-8 text-center backdrop-blur-sm">
            <p className="text-lg font-semibold text-white">Ledger not available yet</p>
            <p className="mt-2 max-w-sm text-sm text-gray-400">
              This match&apos;s bet ledger unlocks once betting closes
              {match.cutoffTime && ` (${new Date(match.cutoffTime).toLocaleString()})`}.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const settled = !!match.result;

  // Projected (pre-result) or real (post-settlement) dividend for a bet under one outcome.
  function dividendIf(bet: ApiBet, outcome: "A" | "draw" | "B") {
    if (settled) {
      // once settled, only the actual result column shows the real locked-in dividend
      if (outcome !== match!.result) return null;
      return bet.dividend ?? 0;
    }
    if (bet.choice === outcome) {
      const odds = match!.odds[outcome];
      return odds !== null ? Number((bet.stake * odds).toFixed(2)) : 0;
    }
    return -bet.stake;
  }

  const columns: { key: "A" | "draw" | "B"; label: string }[] = [
    { key: "A", label: match.teamA },
    { key: "draw", label: "Draw" },
    { key: "B", label: match.teamB },
  ];

  const betUserIds = new Set(bets.map((b) => b.userId._id));
  const penaltiesForNonBettors = match.penalties.filter((p) => !betUserIds.has(p.userId._id));

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

        <div className="relative mx-auto max-w-4xl">
          <h1 className="mb-1 text-2xl font-bold text-white">
            {match.teamA} <span className="text-gray-500">vs</span> {match.teamB}
          </h1>
          <p className="mb-1 text-sm text-gray-400">
            {new Date(match.kickoff).toLocaleString()} · Odds {match.odds.A ?? "—"} /{" "}
            {match.odds.draw ?? "—"} / {match.odds.B ?? "—"}
          </p>

          {settled && (
            <p className="mb-6 inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400">
              Final result:{" "}
              {match.result === "A" ? match.teamA : match.result === "B" ? match.teamB : "Draw"}
            </p>
          )}
          {!settled && <div className="mb-6" />}

          <div className="overflow-x-auto rounded-2xl border border-green-900 bg-[#0E231B]/90 backdrop-blur-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-green-900 text-xs text-gray-400">
                  <th className="px-4 py-3 text-left">Punter</th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-3 py-3 text-right">
                      Stake ({c.label})
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right">Penalty</th>
                  {columns.map((c) => (
                    <th key={`div-${c.key}`} className="px-3 py-3 text-right">
                      {settled ? `Payout` : `If ${c.label} wins`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bets.map((b) => (
                  <tr key={b._id} className="border-b border-green-900/50 last:border-b-0">
                    <td className="px-4 py-3 text-white">
                      {b.userId.name} {b.userId._id === user.id && <span className="text-green-400">(you)</span>}
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-3 text-right text-gray-300">
                        {b.choice === c.key ? b.stake : ""}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right text-gray-500">0</td>
                    {columns.map((c) => {
                      const val = dividendIf(b, c.key);
                      if (val === null) return <td key={`div-${c.key}`} className="px-3 py-3 text-right text-gray-600">—</td>;
                      return (
                        <td
                          key={`div-${c.key}`}
                          className={`px-3 py-3 text-right font-medium ${
                            val >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {val >= 0 ? "+" : ""}
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {penaltiesForNonBettors.map((p) => (
                  <tr key={p.userId._id} className="border-b border-green-900/50 bg-red-500/5 last:border-b-0">
                    <td className="px-4 py-3 text-white">
                      {p.userId.name}{" "}
                      {p.userId._id === user.id && <span className="text-green-400">(you)</span>}
                      <span className="ml-2 text-xs text-gray-500">(no bet placed)</span>
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-3 text-right text-gray-600">—</td>
                    ))}
                    <td className="px-3 py-3 text-right font-medium text-red-400">-{p.amount}</td>
                    {columns.map((c) => (
                      <td key={`div-${c.key}`} className="px-3 py-3 text-right text-gray-600">—</td>
                    ))}
                  </tr>
                ))}

                {bets.length === 0 && penaltiesForNonBettors.length === 0 && (
                  <tr>
                    <td colSpan={2 + columns.length * 2} className="px-4 py-6 text-center text-gray-500">
                      No bets placed on this match yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!settled && (
            <p className="mt-4 text-xs text-gray-500">
              These are projected payouts based on current stakes — final numbers lock in once
              the admin declares the result.
            </p>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
