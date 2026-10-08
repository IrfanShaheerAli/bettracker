"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ApiAnswer = {
  _id: string;
  userId: { _id: string; name: string };
  answer: string;
  dividend: number | null;
};
type ApiSideBet = {
  _id: string;
  label: string;
  stake: number;
  correctAnswer: string | null;
};
type ApiParticipant = { _id: string; name: string };
type ApiMatch = { tournamentId: string; teamA: string; teamB: string };

export default function AdminSideBetsTablePage() {
  const params = useParams();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<ApiMatch | null>(null);
  const [sideBets, setSideBets] = useState<ApiSideBet[]>([]);
  const [answersByBet, setAnswersByBet] = useState<Record<string, ApiAnswer[]>>({});
  const [participants, setParticipants] = useState<ApiParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const matchRes = await fetch(`/api/matches/${matchId}`);
      const matchData: ApiMatch = await matchRes.json();
      setMatch(matchData);

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
    load();
  }, [matchId]);

  if (loading || !match) {
    return <main className="min-h-screen bg-[#071A12] p-8 text-gray-400">Loading…</main>;
  }

  function cellFor(sideBetId: string, userId: string) {
    return (answersByBet[sideBetId] ?? []).find((a) => a.userId._id === userId) ?? null;
  }

  function totalFor(userId: string) {
    let total = 0;
    for (const sb of sideBets) {
      const cell = cellFor(sb._id, userId);
      if (cell && cell.dividend !== null) total += cell.dividend;
    }
    return total;
  }

  return (
    <main className="min-h-screen bg-[#071A12] p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/admin/matches/${matchId}/sidebets`}
          className="mb-4 inline-block text-xs text-gray-400 hover:text-white"
        >
          ← Back to Manage Side Bets
        </Link>

        <h1 className="mb-1 text-2xl font-bold text-white">
          {match.teamA} vs {match.teamB} — Side Bets Table
        </h1>
        <p className="mb-8 text-sm text-gray-400">
          Every participant&apos;s answers and payouts across all side bets for this match.
        </p>

        {sideBets.length === 0 ? (
          <p className="rounded-xl border border-green-900 bg-[#0E231B] p-6 text-sm text-gray-400">
            No side bets have been added for this match yet.
          </p>
        ) : (
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
                    <td className="sticky left-0 bg-[#0E231B] px-4 py-3 text-white">{p.name}</td>
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
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
