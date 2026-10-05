"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
  answerCount: number;
  pool: number;
};
type ApiParticipant = { _id: string; name: string };
type ApiMatch = { tournamentId: string };

export default function AdminSideBetsPage() {
  const params = useParams();
  const matchId = params.matchId as string;

  const [sideBets, setSideBets] = useState<ApiSideBet[]>([]);
  const [answersByBet, setAnswersByBet] = useState<Record<string, ApiAnswer[]>>({});
  const [participants, setParticipants] = useState<ApiParticipant[]>([]);
  const [label, setLabel] = useState("");
  const [stake, setStake] = useState("30");
  const [correctAnswerInputs, setCorrectAnswerInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const matchRes = await fetch(`/api/matches/${matchId}`);
    const matchData: ApiMatch = await matchRes.json();

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
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !stake) return;

    await fetch(`/api/matches/${matchId}/sidebets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim(), stake: Number(stake) }),
    });

    setLabel("");
    setStake("30");
    await loadAll();
  }

  async function handleDeclare(sideBetId: string) {
    const answer = correctAnswerInputs[sideBetId];
    if (!answer?.trim()) return;
    if (!confirm(`Declare "${answer}" as the correct answer? This settles every submitted guess permanently.`)) return;

    await fetch(`/api/sidebets/${sideBetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correctAnswer: answer.trim() }),
    });

    await loadAll();
  }

  async function handleDelete(sideBetId: string, label: string) {
    if (!confirm(`Delete the side bet "${label}"? This also deletes every submitted answer for it.`)) return;
    await fetch(`/api/sidebets/${sideBetId}`, { method: "DELETE" });
    await loadAll();
  }

  if (loading) {
    return <main className="min-h-screen bg-[#071A12] p-8 text-gray-400">Loading…</main>;
  }

  // Build a cell lookup: cellFor(sideBetId, userId) -> their answer + dividend, if any
  function cellFor(sideBetId: string, userId: string) {
    const answers = answersByBet[sideBetId] ?? [];
    return answers.find((a) => a.userId._id === userId) ?? null;
  }

  // Each participant's running total across every side bet on this match
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
        <h1 className="mb-1 text-2xl font-bold text-white">Side Bets</h1>
        <p className="mb-8 text-sm text-gray-400">
          Custom prediction questions for this match — HT score, top scorer, anything else.
        </p>

        {/* Combined ledger-style table across every side bet */}
        {sideBets.length > 0 && (
          <div className="mb-8 overflow-x-auto rounded-2xl border border-green-900 bg-[#0E231B]">
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

        <form
          onSubmit={handleCreate}
          className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-green-900 bg-[#0E231B] p-5"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-400">Question label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. HT Score ARG - ESP"
              className="w-full rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Stake (₹, flat for everyone)</label>
            <input
              type="number"
              min={1}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-32 rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-green-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-400"
          >
            + Add side bet
          </button>
        </form>

        <div className="space-y-3">
          {sideBets.map((sb) => (
            <div key={sb._id} className="flex items-center justify-between rounded-xl border border-green-900 bg-[#0E231B] p-4">
              <div>
                <p className="text-sm font-semibold text-white">{sb.label}</p>
                <p className="text-xs text-gray-400">
                  ₹{sb.stake} each · {sb.answerCount} answer{sb.answerCount === 1 ? "" : "s"} · Pool ₹{sb.pool}
                </p>
              </div>

              {sb.correctAnswer ? (
                <p className="text-xs font-semibold text-blue-400">Correct: {sb.correctAnswer} ✓</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    placeholder="Correct answer"
                    value={correctAnswerInputs[sb._id] ?? ""}
                    onChange={(e) =>
                      setCorrectAnswerInputs((prev) => ({ ...prev, [sb._id]: e.target.value }))
                    }
                    className="w-40 rounded-lg border border-green-700 bg-transparent p-2 text-xs text-white outline-none focus:border-green-400"
                  />
                  <button
                    onClick={() => handleDeclare(sb._id)}
                    className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-black hover:bg-blue-400"
                  >
                    Declare
                  </button>
                  <button
                    onClick={() => handleDelete(sb._id, sb.label)}
                    className="rounded-lg border border-red-800 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {sideBets.length === 0 && (
            <p className="text-sm text-gray-500">No side bets on this match yet — add one above.</p>
          )}
        </div>
      </div>
    </main>
  );
}
