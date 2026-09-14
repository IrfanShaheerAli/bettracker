"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ApiTournament = { _id: string; status: string };
type ApiUser = { _id: string; role: string };

export default function AdminDashboard() {
  const [tournaments, setTournaments] = useState<ApiTournament[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [openMatches, setOpenMatches] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tRes, uRes] = await Promise.all([fetch("/api/tournaments"), fetch("/api/users")]);
      const tournamentsData: ApiTournament[] = await tRes.json();
      const usersData: ApiUser[] = await uRes.json();

      setTournaments(tournamentsData);
      setUsers(usersData);

      // count open matches across every tournament
      const matchLists = await Promise.all(
        tournamentsData.map((t) => fetch(`/api/tournaments/${t._id}/matches`).then((r) => r.json()))
      );
      const open = matchLists.flat().filter((m: { bettingOpen: boolean }) => m.bettingOpen).length;
      setOpenMatches(open);

      setLoading(false);
    }
    load();
  }, []);

  const participantCount = users.filter((u) => u.role === "participant").length;
  const activeTournaments = tournaments.filter((t) => t.status === "active").length;

  const stats = [
    { label: "Participants", value: participantCount, href: "/admin/users" },
    { label: "Tournaments", value: tournaments.length, href: "/admin/tournaments" },
    { label: "Active tournaments", value: activeTournaments, href: "/admin/tournaments" },
    { label: "Matches with betting open", value: openMatches, href: "/admin/tournaments" },
  ];

  if (loading) return <p className="text-gray-400">Loading dashboard…</p>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Dashboard</h1>
      <p className="mb-8 text-sm text-gray-400">
        Overview of everything running on BetTracker right now.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-green-900 bg-[#0E231B] p-5 transition hover:border-green-500"
          >
            <p className="text-3xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-xs text-gray-400">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-green-900 bg-[#0E231B] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/tournaments"
            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-400"
          >
            + New tournament
          </Link>
          <Link
            href="/admin/users"
            className="rounded-lg border border-green-700 px-4 py-2 text-sm font-medium text-gray-200 hover:border-green-400"
          >
            + New participant login
          </Link>
        </div>
      </div>
    </div>
  );
}
