"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type ApiUser = { _id: string; name: string; username: string; role: string };
type ApiMatch = {
  _id: string;
  teamA: string;
  teamB: string;
  kickoff: string;
  bettingOpen: boolean;
  result?: "A" | "draw" | "B" | null;
  odds: { A: number | null; draw: number | null; B: number | null };
  cutoffTime: string | null;
};
type ApiTournament = {
  _id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  bettingCutoffHours: number;
  participantIds: ApiUser[];
};

export default function AdminTournamentDetailPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<ApiTournament | null>(null);
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [kickoff, setKickoff] = useState("");

  async function loadAll() {
    const [tRes, mRes, uRes] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}`),
      fetch(`/api/tournaments/${tournamentId}/matches`),
      fetch("/api/users"),
    ]);
    setTournament(await tRes.json());
    setMatches(await mRes.json());
    setAllUsers(await uRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function handleStatusChange(status: string) {
    await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadAll();
  }

  async function toggleBetting(matchId: string, current: boolean) {
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bettingOpen: !current }),
    });
    await loadAll();
  }

  async function declareResult(matchId: string, result: "A" | "draw" | "B") {
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    });
    await loadAll();
  }

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!teamA.trim() || !teamB.trim() || !kickoff) return;

    await fetch(`/api/tournaments/${tournamentId}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamA, teamB, kickoff }),
    });

    setTeamA("");
    setTeamB("");
    setKickoff("");
    await loadAll();
  }

  async function addParticipant(userId: string) {
    await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addParticipantId: userId }),
    });
    await loadAll();
  }

  async function removeParticipant(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this tournament? They stay a valid user — just no longer in this tournament.`)) return;

    await fetch(`/api/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeParticipantId: userId }),
    });
    await loadAll();
  }

  async function deleteMatch(matchId: string, teamA: string, teamB: string) {
    if (!confirm(`Permanently delete ${teamA} vs ${teamB}? This also deletes all bets and penalties tied to it.`)) return;

    await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
    await loadAll();
  }

  if (loading || !tournament) return <p className="text-gray-400">Loading…</p>;

  const participantIds = tournament.participantIds.map((p) => p._id);
  const nonParticipants = allUsers.filter(
    (u) => u.role === "participant" && !participantIds.includes(u._id)
  );

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>

        <Link
          href={`/tournaments/${tournamentId}/leaderboard`}
          className="rounded-full border border-blue-700 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/10"
        >
          View Leaderboard →
        </Link>

        <select
          value={tournament.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className={`rounded-full border-none px-3 py-1 text-xs font-medium outline-none ${
            tournament.status === "active"
              ? "bg-green-500/20 text-green-400"
              : tournament.status === "completed"
              ? "bg-gray-500/20 text-gray-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          <option value="upcoming">upcoming</option>
          <option value="active">active</option>
          <option value="completed">completed</option>
        </select>
      </div>

      <p className="mb-8 text-sm text-gray-400">
        {matches.length} match{matches.length === 1 ? "" : "es"} ·{" "}
        {tournament.participantIds.length} participant
        {tournament.participantIds.length === 1 ? "" : "s"}
        <br />
        {new Date(tournament.startDate).toLocaleDateString()} –{" "}
        {new Date(tournament.endDate).toLocaleDateString()} · Betting cutoff:{" "}
        {tournament.bettingCutoffHours}h before kickoff
      </p>

      {/* Add match — no odds inputs anymore, odds are computed live from real bets */}
      <form
        onSubmit={handleAddMatch}
        className="mb-8 rounded-xl border border-green-900 bg-[#0E231B] p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-white">Add a match</h2>
        <p className="mb-3 text-xs text-gray-500">
          No odds to enter — they&apos;re calculated live once people place stakes.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input
            placeholder="Team A"
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
            className="rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
          />
          <input
            placeholder="Team B"
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
            className="rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
          />
          <input
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            className="rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
          />
        </div>

        <button
          type="submit"
          className="mt-3 rounded-lg bg-green-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-400"
        >
          + Add match
        </button>
      </form>

      {/* Matches list */}
      <div className="mb-8 space-y-3">
        {matches.map((m) => (
          <div
            key={m._id}
            className="flex flex-col gap-3 rounded-xl border border-green-900 bg-[#0E231B] p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-white">
                {m.teamA} <span className="text-gray-500">vs</span> {m.teamB}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Odds {m.odds.A ?? "—"} / {m.odds.draw ?? "—"} / {m.odds.B ?? "—"} ·{" "}
                {new Date(m.kickoff).toLocaleString()}
              </p>
              {m.cutoffTime && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Auto-closes: {new Date(m.cutoffTime).toLocaleString()}
                </p>
              )}
              <Link
                href={`/tournaments/${tournamentId}/matches/${m._id}`}
                className="mt-1 inline-block text-xs text-blue-400 hover:underline"
              >
                View full bet ledger →
              </Link>
              <br />
              <Link
                href={`/admin/matches/${m._id}/sidebets`}
                className="mt-1 inline-block text-xs text-purple-400 hover:underline"
              >
                Manage side bets →
              </Link>
            </div>

            <button
              onClick={() => toggleBetting(m._id, m.bettingOpen)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                m.bettingOpen
                  ? "bg-green-500 text-black hover:bg-green-400"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${m.bettingOpen ? "bg-black" : "bg-gray-400"}`} />
              Betting {m.bettingOpen ? "Open" : "Closed"}
            </button>

            <button
              onClick={() => deleteMatch(m._id, m.teamA, m.teamB)}
              className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
            >
              Delete match
            </button>

            {!m.bettingOpen && (
              <div className="flex items-center gap-2">
                {m.result ? (
                  <span className="rounded-full bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-400">
                    Result: {m.result === "A" ? m.teamA : m.result === "B" ? m.teamB : "Draw"} ✓
                  </span>
                ) : (
                  <>
                    <span className="text-xs text-gray-500">Declare result:</span>
                    <button
                      onClick={() => declareResult(m._id, "A")}
                      className="rounded-lg border border-blue-700 px-2.5 py-1 text-xs text-blue-400 hover:bg-blue-500/10"
                    >
                      {m.teamA}
                    </button>
                    <button
                      onClick={() => declareResult(m._id, "draw")}
                      className="rounded-lg border border-blue-700 px-2.5 py-1 text-xs text-blue-400 hover:bg-blue-500/10"
                    >
                      Draw
                    </button>
                    <button
                      onClick={() => declareResult(m._id, "B")}
                      className="rounded-lg border border-blue-700 px-2.5 py-1 text-xs text-blue-400 hover:bg-blue-500/10"
                    >
                      {m.teamB}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {matches.length === 0 && (
          <p className="text-sm text-gray-500">No matches yet — add the first one above.</p>
        )}
      </div>

      {/* Participants */}
      <div className="rounded-xl border border-green-900 bg-[#0E231B] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Participants</h2>

        {tournament.participantIds.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-2">
            {tournament.participantIds.map((p) => (
              <li
                key={p._id}
                className="flex items-center gap-2 rounded-full bg-green-500/20 py-1 pl-3 pr-1.5 text-xs text-green-400"
              >
                {p.name}
                <button
                  onClick={() => removeParticipant(p._id, p.name)}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-green-500/30"
                  title={`Remove ${p.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {nonParticipants.length > 0 ? (
          <div>
            <p className="mb-2 text-xs text-gray-400">Add existing users to this tournament:</p>
            <div className="flex flex-wrap gap-2">
              {nonParticipants.map((u) => (
                <button
                  key={u._id}
                  onClick={() => addParticipant(u._id)}
                  className="rounded-full border border-green-700 px-3 py-1 text-xs text-gray-300 hover:border-green-400 hover:text-white"
                >
                  + {u.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">All existing participants are already in this tournament.</p>
        )}
      </div>
    </div>
  );
}
