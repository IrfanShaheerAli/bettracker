"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getSession, logout } from "@/lib/session";
import { User } from "@/types";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getSession();

    if (!session || session.role !== "admin") {
      router.replace("/login");
      return;
    }

    setUser(session);
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071A12] text-gray-400">
        Checking access…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#071A12]">
      <aside className="flex w-56 flex-col border-r border-green-900 bg-[#0E231B] p-5">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-lg">
            ⚽
          </div>
          <div>
            <p className="text-sm font-bold text-white">BetTracker</p>
            <p className="text-[10px] uppercase tracking-wide text-green-400">Admin</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-green-500 text-black"
                    : "text-gray-300 hover:bg-green-900/40"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-green-900 pt-4">
          <p className="mb-2 truncate text-xs text-gray-400">
            Signed in as <span className="text-white">{user?.name}</span>
          </p>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="w-full rounded-lg border border-green-800 py-2 text-xs font-medium text-gray-300 hover:border-green-500 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
