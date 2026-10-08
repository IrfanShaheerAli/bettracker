"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ApiSideBet = {
  _id: string;
  label: string;
  stake: number;
  correctAnswer: string | null;
  answerCount: number;
  pool: number;
};

export default function AdminSideBetsPage() {
  const params = useParams();
  const matchId = params.matchId as string;

  const [sideBets, setSideBets] = useState<ApiSideBet[]>([]);
  const [label, setLabel] = useState("");
  const [stake, setStake] = useState("30");
  const [correctAnswerInputs, setCorrectAnswerInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const res = await fetch(`/api/matches/${matchId}/sidebets`);
    setSideBets(await res.json());
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

  return (
    <main className="min-h-screen bg-[#071A12] p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Manage Side Bets</h1>
          <Link
            href={`/admin/matches/${matchId}/sidebets/table`}
            className="rounded-full border border-blue-700 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/10"
          >
            View Side Bets Table →
          </Link>
        </div>
        <p className="mb-8 text-sm text-gray-400">
          Add questions, declare correct answers, or remove side bets for this match.
        </p>

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
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-blue-400">Correct: {sb.correctAnswer} ✓</p>
                  <button
                    onClick={() => handleDelete(sb._id, sb.label)}
                    className="rounded-lg border border-red-800 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
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
