"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ApiTournament = {
  _id: string;
  name: string;
  status: string;
  participantIds: { _id: string; name: string }[];
};

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<ApiTournament[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
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
    if (!name.trim()) return;

    await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    setName("");
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
        className="mb-8 flex flex-col gap-3 rounded-xl border border-green-900 bg-[#0E231B] p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-400">Tournament name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Champions League — Round of 16"
            className="w-full rounded-lg border border-green-700 bg-transparent p-3 text-sm text-white outline-none focus:border-green-400"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-green-500 px-5 py-3 text-sm font-semibold text-black hover:bg-green-400"
        >
          + Create tournament
        </button>
      </form>

      <div className="space-y-3">
        {tournaments.map((t) => (
          <Link
            key={t._id}
            href={`/admin/tournaments/${t._id}`}
            className="flex items-center justify-between rounded-xl border border-green-900 bg-[#0E231B] p-5 transition hover:border-green-500"
          >
            <div>
              <p className="font-semibold text-white">{t.name}</p>
              <p className="mt-1 text-xs text-gray-400">
                {matchCounts[t._id] ?? 0} match{(matchCounts[t._id] ?? 0) === 1 ? "" : "es"} ·{" "}
                {t.participantIds.length} participant{t.participantIds.length === 1 ? "" : "s"}
              </p>
            </div>

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
          </Link>
        ))}

        {tournaments.length === 0 && (
          <p className="text-sm text-gray-500">No tournaments yet — create one above.</p>
        )}
      </div>
    </div>
  );
}
