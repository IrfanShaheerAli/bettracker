"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TournamentTabs({ tournamentId }: { tournamentId: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/tournaments/${tournamentId}`, label: "Matches" },
    { href: `/tournaments/${tournamentId}/participants`, label: "Participants" },
  ];

  return (
    <div className="mb-6 flex gap-1 border-b border-green-900">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-green-500 text-white"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
