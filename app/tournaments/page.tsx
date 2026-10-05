"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSession } from "@/lib/session";
import { User } from "@/types";

type ApiTournament = {
  _id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  participantIds: { _id: string }[];
};

export default function TournamentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<ApiTournament[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [netWinnings, setNetWinnings] = useState(0);
  const [betsPlaced, setBetsPlaced] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadTournaments(currentUserId: string) {
    const res = await fetch("/api/tournaments");
    const data: ApiTournament[] = await res.json();
    setTournaments(data);

    const counts: Record<string, number> = {};
    await Promise.all(
      data.map(async (t) => {
        const mRes = await fetch(`/api/tournaments/${t._id}/matches`);
        counts[t._id] = (await mRes.json()).length;
      })
    );
    setMatchCounts(counts);

    const statsRes = await fetch(`/api/users/${currentUserId}/stats`);
    const stats = await statsRes.json();
    setNetWinnings(stats.netWinnings);
    setBetsPlaced(stats.betsPlaced);

    setLoading(false);
  }

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUser(session);
    loadTournaments(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleJoin(tournamentId: string) {
    if (!user) return;
    await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addParticipantId: user.id }),
    });
    await loadTournaments(user.id);
  }

  if (!user || loading) return null;

  const joinedTournaments = tournaments.filter((t) =>
    t.participantIds.some((p) => p._id === user.id)
  );

  return (
    <>
      <Navbar />

      <main
        className="relative min-h-screen bg-cover bg-center bg-fixed"
        style={{ backgroundImage: "url('/hero-stadium.png')" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04140D]/25 via-[#04140D]/80 to-[#04140D]/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#04140D]/70" />

        <div className="relative px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <p className="text-2xl font-bold text-white">Welcome, {user.name}</p>

            {joinedTournaments.length > 0 ? (
              <>
                <p className="mt-1 text-sm text-green-400">
                  You&apos;re in {joinedTournaments.length} tournament
                  {joinedTournaments.length === 1 ? "" : "s"}
                </p>

                <div className="mt-5 grid max-w-md grid-cols-3 gap-3">
                  <div className="rounded-xl border border-green-900 bg-[#0E231B]/80 p-3">
                    <p className="text-xs text-gray-400">Joined</p>
                    <p className="mt-1 text-xl font-semibold text-white">{joinedTournaments.length}</p>
                  </div>
                  <div className="rounded-xl border border-green-900 bg-[#0E231B]/80 p-3">
                    <p className="text-xs text-gray-400">Bets placed</p>
                    <p className="mt-1 text-xl font-semibold text-white">{betsPlaced}</p>
                  </div>
                  <div className="rounded-xl border border-green-900 bg-[#0E231B]/80 p-3">
                    <p className="text-xs text-gray-400">Net winnings</p>
                    <p
                      className={`mt-1 text-xl font-semibold ${
                        netWinnings >= 0 ? "text-white" : "text-red-400"
                      }`}
                    >
                      {netWinnings >= 0 ? "+" : ""}
                      {netWinnings.toFixed(2)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-2 max-w-md text-sm text-gray-400">
                You haven&apos;t joined a tournament yet — join one below to start predicting.
              </p>
            )}
          </div>
        </div>

        <div className="relative px-6 pb-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-1 text-xl font-bold text-white">Tournaments</h2>
            <p className="mb-8 text-sm text-gray-400">
              Once you join, you&apos;re expected to bet on every match in it — missing one means a penalty.
            </p>

            <div className="space-y-4">
              {tournaments.map((t) => {
                const joined = t.participantIds.some((p) => p._id === user.id);
                const hasStarted = new Date() >= new Date(t.startDate);

                return (
                  <div
                    key={t._id}
                    className="flex flex-col gap-4 rounded-2xl border border-green-900 bg-[#0E231B]/90 p-6 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-lg font-semibold text-white">{t.name}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {matchCounts[t._id] ?? 0} match{(matchCounts[t._id] ?? 0) === 1 ? "" : "es"} ·{" "}
                        {t.participantIds.length} participant{t.participantIds.length === 1 ? "" : "s"} ·{" "}
                        <span className="capitalize">{t.status}</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(t.startDate).toLocaleDateString()} –{" "}
                        {new Date(t.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!hasStarted ? (
                        <span className="rounded-full bg-yellow-500/20 px-4 py-2 text-xs font-semibold text-yellow-400">
                          Upcoming — starts {new Date(t.startDate).toLocaleDateString()}
                        </span>
                      ) : joined ? (
                        <Link
                          href={`/tournaments/${t._id}`}
                          className="rounded-lg bg-green-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-400"
                        >
                          View matches
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleJoin(t._id)}
                          className="rounded-lg border border-green-500 px-5 py-2.5 text-sm font-semibold text-green-400 hover:bg-green-500/10"
                        >
                          Join tournament
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {tournaments.length === 0 && (
                <p className="text-sm text-gray-500">No tournaments yet — ask your admin to create one.</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
