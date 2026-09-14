"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const user = await login(username.trim(), password);

    setLoading(false);

    if (!user) {
      setError("Wrong username or password. Ask your admin if you're not sure.");
      return;
    }

    router.push(user.role === "admin" ? "/admin" : "/tournaments");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#071A12] px-6">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl">
          ⚽
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wide text-white">
            BetTracker
          </h1>

          <p className="text-xs text-green-400">Predict • Compete • Win</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-green-800 bg-[#0E231B] p-8"
      >
        <h2 className="mb-1 text-xl font-semibold text-white">Sign in</h2>

        <p className="mb-6 text-sm text-gray-400">
          Accounts are created by your tournament admin — there&apos;s no self sign-up.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-green-700 bg-transparent p-3 text-white outline-none focus:border-green-400"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-green-700 bg-transparent p-3 text-white outline-none focus:border-green-400"
              required
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-green-500 py-3 font-semibold text-black transition hover:bg-green-400 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-xs text-gray-500">
        Locked out? Contact your admin to reset your password.
      </p>
    </main>
  );
}
