"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TournamentTabs from "@/components/TournamentTabs";
import { getSession } from "@/lib/session";
import { User } from "@/types";

type ApiParticipant = { _id: string; name: string; username: string };
type ApiTournament = { _id: string; name: string; participantIds: ApiParticipant[] };

export default function TournamentParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [tournament, setTournament] = useState<ApiTournament | null>(null);
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

      if (!tData.participantIds.some((p) => p._id === session!.id)) {
        router.replace("/tournaments");
        return;
      }
      setTournament(tData);
      setLoading(false);
    }
    load();
  }, [router, tournamentId]);

  if (!user || !tournament || loading) return null;

  return (
    <>
      <Navbar />

      <main
        className="relative min-h-screen bg-cover bg-center bg-fixed px-6 py-10"
        style={{ backgroundImage: "url('/hero-stadium.png')" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04140D]/25 via-[#04140D]/80 to-[#04140D]/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#04140D]/70" />

        <div className="relative mx-auto max-w-3xl">
          <h1 className="mb-1 text-2xl font-bold text-white">{tournament.name}</h1>

          <TournamentTabs tournamentId={tournamentId} />

          <p className="mb-6 text-sm text-gray-400">Everyone taking part in this tournament.</p>

          <div className="space-y-3">
            {tournament.participantIds.map((p) => (
              <div
                key={p._id}
                className="flex items-center justify-between rounded-xl border border-green-900 bg-[#0E231B]/90 p-5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {p.name} {p._id === user.id && <span className="text-green-400">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-500">@{p.username}</p>
                  </div>
                </div>
              </div>
            ))}

            {tournament.participantIds.length === 0 && (
              <p className="text-sm text-gray-500">No participants in this tournament yet.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
