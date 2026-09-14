"use client";

import { useEffect, useState } from "react";

type ApiUser = { _id: string; name: string; username: string; role: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    const res = await fetch("/api/users");
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !username.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), username: username.trim(), password: password.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not create user.");
      return;
    }

    setName("");
    setUsername("");
    setPassword("");
    await loadUsers();
  }

  const participants = users.filter((u) => u.role === "participant");

  if (loading) return <p className="text-gray-400">Loading users…</p>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Users</h1>
      <p className="mb-8 text-sm text-gray-400">
        Create a login for each participant. There&apos;s no self sign-up — this is
        the only way people get access.
      </p>

      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-xl border border-green-900 bg-[#0E231B] p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-white">Create participant login</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sam"
              className="w-full rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sam"
              className="w-full rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="temporary password"
              className="w-full rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          className="mt-4 rounded-lg bg-green-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-green-400"
        >
          + Create login
        </button>
      </form>

      <div className="rounded-xl border border-green-900 bg-[#0E231B] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">
          Participants ({participants.length})
        </h2>

        <div className="space-y-2">
          {participants.map((u) => (
            <div
              key={u._id}
              className="flex items-center justify-between rounded-lg border border-green-900 px-4 py-2.5"
            >
              <div>
                <p className="text-sm text-white">{u.name}</p>
                <p className="text-xs text-gray-500">@{u.username}</p>
              </div>
            </div>
          ))}

          {participants.length === 0 && <p className="text-sm text-gray-500">No participants yet.</p>}
        </div>
      </div>
    </div>
  );
}
