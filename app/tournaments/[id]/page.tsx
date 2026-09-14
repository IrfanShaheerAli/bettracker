"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MatchCard from "@/components/MatchCard";
import TournamentTabs from "@/components/TournamentTabs";
import { getSession } from "@/lib/session";
import { User } from "@/types";

type ApiMatch = {
  _id: string;
  teamA: string;
  teamB: string;
  kickoff: string;
  bettingOpen: boolean;
  odds: { A: number | null; draw: number | null; B: number | null };
};
type ApiBet = { _id: string; userId: { _id: string }; matchId: string; choice: "A" | "draw" | "B" };
type ApiTournament = { _id: string; name: string; participantIds: { _id: string }[] };

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [tournament, setTournament] = useState<ApiTournament | null>(null);
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [myBets, setMyBets] = useState<Record<string, "A" | "draw" | "B">>({});
  const [loading, setLoading] = useState(true);

  async function loadAll(currentUserId: string) {
    const tRes = await fetch(`/api/tournaments/${tournamentId}`);
    const tData: ApiTournament = await tRes.json();

    if (!tData.participantIds.some((p) => p._id === currentUserId)) {
      router.replace("/tournaments");
      return;
    }
    setTournament(tData);

    const mRes = await fetch(`/api/tournaments/${tournamentId}/matches`);
    const mData: ApiMatch[] = await mRes.json();
    setMatches(mData);

    const betsByMatch: Record<string, "A" | "draw" | "B"> = {};
    await Promise.all(
      mData.map(async (m) => {
        const bRes = await fetch(`/api/matches/${m._id}/bets`);
        const bets: ApiBet[] = await bRes.json();
        const mine = bets.find((b) => b.userId._id === currentUserId);
        if (mine) betsByMatch[m._id] = mine.choice;
      })
    );
    setMyBets(betsByMatch);
    setLoading(false);
  }

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUser(session);
    loadAll(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, tournamentId]);

  async function handleBet(matchId: string, choice: "A" | "draw" | "B", stake: number) {
    if (!user) return;
    const res = await fetch(`/api/matches/${matchId}/bets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, choice, stake }),
    });
    if (res.ok) await loadAll(user.id);
  }

  if (!user || !tournament || loading) return null;

  const betCount = Object.keys(myBets).length;
  const allBetsPlaced = betCount === matches.length && matches.length > 0;

  return (
    <>
      <Navbar />

      <main
        className="relative min-h-screen bg-cover bg-center bg-fixed px-6 py-10"
        style={{ backgroundImage: "url('/hero-stadium.png')" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04140D]/25 via-[#04140D]/80 to-[#04140D]/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#04140D]/70" />

        <div className="relative mx-auto max-w-5xl">
          <h1 className="mb-1 text-2xl font-bold text-white">{tournament.name}</h1>

          <TournamentTabs tournamentId={tournamentId} />

          <div
            className={`mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium ${
              allBetsPlaced ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            {allBetsPlaced
              ? "✓ You've bet on every match in this tournament"
              : `${betCount} / ${matches.length} matches bet on — bet on all of them or you'll be penalized`}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {matches.map((m) => (
              <div key={m._id}>
                <MatchCard
                  teamA={m.teamA}
                  teamB={m.teamB}
                  date={new Date(m.kickoff).toLocaleString()}
                  odds={m.odds}
                  bettingOpen={m.bettingOpen}
                  userChoice={myBets[m._id]}
                  onBet={(choice, stake) => handleBet(m._id, choice, stake)}
                />
                <Link
                  href={`/tournaments/${tournamentId}/matches/${m._id}`}
                  className="mt-2 inline-block text-xs text-green-400 hover:underline"
                >
                  View full bet ledger →
                </Link>
              </div>
            ))}
          </div>

          {matches.length === 0 && (
            <p className="text-sm text-gray-500">No matches added to this tournament yet.</p>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
