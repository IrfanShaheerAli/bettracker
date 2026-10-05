"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ApiTournament = {
  _id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  bettingCutoffHours: number;
  participantIds: { _id: string; name: string }[];
};

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<ApiTournament[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bettingCutoffHours, setBettingCutoffHours] = useState("2");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadTournaments() {
    const res = await fetch("/api/tournaments");
    const data: ApiTournament[] = await res.json();
    setTournaments(data);

    const counts: Record<string, number> = {};
    await Promise.all(
      data.map(async (t) => {
        const mRes = await fetch(`/api/tournaments/${t._id}/matches`);
        const matches = await mRes.json();
        counts[t._id] = matches.length;
      })
    );
    setMatchCounts(counts);
    setLoading(false);
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !startDate || !endDate) {
      setError("Name, start date, and end date are all required.");
      return;
    }

    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        startDate,
        endDate,
        bettingCutoffHours: Number(bettingCutoffHours) || 2,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not create tournament.");
      return;
    }

    setName("");
    setStartDate("");
    setEndDate("");
    setBettingCutoffHours("2");
    await loadTournaments();
  }

  async function handleDelete(tournamentId: string, name: string) {
    if (!confirm(`Permanently delete "${name}"? This also deletes all its matches, bets, and penalties.`)) return;

    await fetch(`/api/tournaments/${tournamentId}`, { method: "DELETE" });
    await loadTournaments();
  }

  if (loading) return <p className="text-gray-400">Loading tournaments…</p>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Tournaments</h1>
      <p className="mb-8 text-sm text-gray-400">
        Football only. Create a tournament, then open it to add matches and participants.
      </p>

      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-xl border border-green-900 bg-[#0E231B] p-5"
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-400">Tournament name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Champions League — Round of 16"
              className="w-full rounded-lg border border-green-700 bg-transparent p-3 text-sm text-white outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-green-700 bg-transparent p-3 text-sm text-white outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-green-700 bg-transparent p-3 text-sm text-white outline-none focus:border-green-400"
            />
          </div>
        </div>

        <div className="mt-3 flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Betting cutoff (hours before kickoff)
            </label>
            <input
              type="number"
              min={0}
              value={bettingCutoffHours}
              onChange={(e) => setBettingCutoffHours(e.target.value)}
              className="w-40 rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-green-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-400"
          >
            + Create tournament
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </form>

      <div className="space-y-3">
        {tournaments.map((t) => (
          <div
            key={t._id}
            className="flex items-center justify-between rounded-xl border border-green-900 bg-[#0E231B] p-5 transition hover:border-green-500"
          >
            <Link href={`/admin/tournaments/${t._id}`} className="flex-1">
              <p className="font-semibold text-white">{t.name}</p>
              <p className="mt-1 text-xs text-gray-400">
                {matchCounts[t._id] ?? 0} match{(matchCounts[t._id] ?? 0) === 1 ? "" : "es"} ·{" "}
                {t.participantIds.length} participant{t.participantIds.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()} ·
                {" "}Cutoff: {t.bettingCutoffHours}h before kickoff
              </p>
            </Link>

            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  t.status === "active"
                    ? "bg-green-500/20 text-green-400"
                    : t.status === "completed"
                    ? "bg-gray-500/20 text-gray-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {t.status}
              </span>

              <button
                onClick={() => handleDelete(t._id, t.name)}
                className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {tournaments.length === 0 && (
          <p className="text-sm text-gray-500">No tournaments yet — create one above.</p>
        )}
      </div>
    </div>
  );
}
