"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSession } from "@/lib/session";
import { User } from "@/types";

type ApiSideBet = {
  _id: string;
  label: string;
  stake: number;
  correctAnswer: string | null;
};
type ApiAnswer = { userId: { _id: string; name: string }; answer: string; dividend: number | null };
type ApiParticipant = { _id: string; name: string };
type ApiMatch = { tournamentId: string; cutoffTime: string | null };

export default function ParticipantSideBetsPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [user, setUser] = useState<User | null>(null);
  const [sideBets, setSideBets] = useState<ApiSideBet[]>([]);
  const [answersByBet, setAnswersByBet] = useState<Record<string, ApiAnswer[]>>({});
  const [participants, setParticipants] = useState<ApiParticipant[]>([]);
  const [cutoffTime, setCutoffTime] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll(currentUserId: string) {
    const matchRes = await fetch(`/api/matches/${matchId}`);
    const matchData: ApiMatch = await matchRes.json();
    setCutoffTime(matchData.cutoffTime);

    const tRes = await fetch(`/api/tournaments/${matchData.tournamentId}`);
    const tData: { participantIds: ApiParticipant[] } = await tRes.json();
    setParticipants(tData.participantIds);

    const res = await fetch(`/api/matches/${matchId}/sidebets`);
    const data: ApiSideBet[] = await res.json();
    setSideBets(data);

    const answersMap: Record<string, ApiAnswer[]> = {};
    await Promise.all(
      data.map(async (sb) => {
        const aRes = await fetch(`/api/sidebets/${sb._id}/answers`);
        answersMap[sb._id] = await aRes.json();
      })
    );
    setAnswersByBet(answersMap);
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
  }, [router, matchId]);

  async function handleSubmit(sideBetId: string) {
    if (!user) return;
    setError("");
    const answer = inputs[sideBetId];
    if (!answer?.trim()) return;

    const res = await fetch(`/api/sidebets/${sideBetId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, answer }),
    });

    if (res.ok) {
      await loadAll(user.id);
    } else {
      const data = await res.json();
      setError(data.error || "Could not submit answer.");
    }
  }

  if (!user || loading) return null;

  const isAdmin = user.role === "admin";
  const cutoffPassed = cutoffTime ? new Date() >= new Date(cutoffTime) : false;
  const canSeeTable = isAdmin || cutoffPassed;

  function cellFor(sideBetId: string, userId: string) {
    const answers = answersByBet[sideBetId] ?? [];
    return answers.find((a) => a.userId._id === userId) ?? null;
  }

  function totalFor(userId: string) {
    let total = 0;
    for (const sb of sideBets) {
      const cell = cellFor(sb._id, userId);
      if (cell && cell.dividend !== null) total += cell.dividend;
    }
    return total;
  }

  const myAnswer = (sideBetId: string) =>
    (answersByBet[sideBetId] ?? []).find((a) => a.userId._id === user.id) ?? null;

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

        <div className="relative mx-auto max-w-5xl">
          <h1 className="mb-1 text-2xl font-bold text-white">Side Bets</h1>
          <p className="mb-8 text-sm text-gray-400">
            Extra prediction questions for this match.
          </p>

          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          {canSeeTable ? (
            // After the deadline (or for admin): the full combined table, same as the match ledger
            <div className="overflow-x-auto rounded-2xl border border-green-900 bg-[#0E231B]">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-green-900 text-xs text-gray-400">
                    <th className="sticky left-0 bg-[#0E231B] px-4 py-3 text-left">Punter</th>
                    {sideBets.map((sb) => (
                      <th key={sb._id} className="px-3 py-3 text-right" colSpan={2}>
                        {sb.label}
                        {sb.correctAnswer && (
                          <span className="ml-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">
                            {sb.correctAnswer}
                          </span>
                        )}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right">Side Bets Total</th>
                  </tr>
                  <tr className="border-b border-green-900 text-[10px] text-gray-600">
                    <th className="sticky left-0 bg-[#0E231B] px-4 py-1 text-left"></th>
                    {sideBets.map((sb) => (
                      <>
                        <th key={`${sb._id}-ans`} className="px-3 py-1 text-right">Answer</th>
                        <th key={`${sb._id}-pay`} className="px-3 py-1 text-right">Payout</th>
                      </>
                    ))}
                    <th className="px-3 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p._id} className="border-b border-green-900/50 last:border-b-0">
                      <td className="sticky left-0 bg-[#0E231B] px-4 py-3 text-white">
                        {p.name} {p._id === user.id && <span className="text-green-400">(you)</span>}
                      </td>
                      {sideBets.map((sb) => {
                        const cell = cellFor(sb._id, p._id);
                        return (
                          <>
                            <td key={`${sb._id}-${p._id}-ans`} className="px-3 py-3 text-right text-gray-300">
                              {cell ? cell.answer : <span className="text-gray-700">–</span>}
                            </td>
                            <td
                              key={`${sb._id}-${p._id}-pay`}
                              className={`px-3 py-3 text-right font-medium ${
                                !cell
                                  ? "text-gray-700"
                                  : cell.dividend === null
                                  ? "text-gray-500"
                                  : cell.dividend >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {!cell
                                ? "–"
                                : cell.dividend === null
                                ? "Pending"
                                : `${cell.dividend >= 0 ? "+" : ""}${cell.dividend.toFixed(2)}`}
                            </td>
                          </>
                        );
                      })}
                      <td
                        className={`px-3 py-3 text-right font-bold ${
                          totalFor(p._id) >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {totalFor(p._id) >= 0 ? "+" : ""}
                        {totalFor(p._id).toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {sideBets.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500">No side bets on this match.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Before the deadline: just your own submission form, not everyone else's answers
            <div className="space-y-4">
              {sideBets.map((sb) => {
                const mine = myAnswer(sb._id);
                return (
                  <div key={sb._id} className="rounded-xl border border-green-900 bg-[#0E231B] p-5">
                    <p className="font-semibold text-white">{sb.label}</p>
                    <p className="mb-3 text-xs text-gray-400">Stake: ₹{sb.stake}</p>

                    {mine ? (
                      <p className="text-sm text-gray-300">
                        Your answer: <span className="text-white">{mine.answer}</span> — waiting for
                        the result.
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          placeholder="Your guess"
                          value={inputs[sb._id] ?? ""}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [sb._id]: e.target.value }))}
                          className="flex-1 rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
                        />
                        <button
                          onClick={() => handleSubmit(sb._id)}
                          className="rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-green-400"
                        >
                          Submit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {sideBets.length === 0 && (
                <p className="text-sm text-gray-500">No side bets on this match.</p>
              )}

              <p className="text-xs text-gray-500">
                The full results table unlocks for everyone once betting closes
                {cutoffTime && ` (${new Date(cutoffTime).toLocaleString()})`}.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
