"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/session";

export default function Navbar() {
  const router = useRouter();

  return (
    <nav className="border-b border-green-900 bg-[#071A13]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
        {/* Logo — doubles as the Home link */}
        <Link href="/tournaments" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500 text-xl">
            ⚽
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-wide text-white">
              BetTracker
            </h1>

            <p className="text-xs text-green-400">
              Predict • Compete • Win
            </p>
          </div>
        </Link>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="rounded-lg border border-green-500 px-5 py-2.5 text-sm font-semibold text-green-400 transition hover:bg-green-500/10"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
