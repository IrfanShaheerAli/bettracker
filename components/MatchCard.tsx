"use client";

import { useState } from "react";

type MatchCardProps = {
  teamA: string;
  teamB: string;
  date: string;
  odds: { A: number | null; draw: number | null; B: number | null };
  bettingOpen: boolean;
  userChoice?: "A" | "draw" | "B";
  onBet: (choice: "A" | "draw" | "B", stake: number) => void;
};

export default function MatchCard({
  teamA,
  teamB,
  date,
  odds,
  bettingOpen,
  userChoice,
  onBet,
}: MatchCardProps) {
  const [pendingChoice, setPendingChoice] = useState<"A" | "draw" | "B" | undefined>(undefined);
  const [stake, setStake] = useState("");

  const options: { key: "A" | "draw" | "B"; label: string; odds: number | null }[] = [
    { key: "A", label: teamA, odds: odds.A },
    { key: "draw", label: "Draw", odds: odds.draw },
    { key: "B", label: teamB, odds: odds.B },
  ];

  const isConfirmed = !!userChoice;
  const stakeNum = Number(stake);
  const canConfirm = !!pendingChoice && stakeNum > 0;

  function handleConfirm() {
    if (pendingChoice && stakeNum > 0) onBet(pendingChoice, stakeNum);
  }

  return (
    <div className="rounded-3xl border border-green-900 bg-[#0E231B] p-6 transition duration-300 hover:-translate-y-1 hover:border-green-500">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {teamA} <span className="text-gray-500">vs</span> {teamB}
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            bettingOpen ? "bg-green-500/20 text-green-400" : "bg-gray-600/30 text-gray-400"
          }`}
        >
          {bettingOpen ? "Betting Open" : "Betting Closed"}
        </span>
      </div>

      <p className="mb-4 text-sm text-gray-500">{date}</p>

      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const isPending = pendingChoice === opt.key;
          const isLockedIn = userChoice === opt.key;
          return (
            <button
              key={opt.key}
              disabled={!bettingOpen || isConfirmed}
              onClick={() => setPendingChoice(opt.key)}
              className={`rounded-xl border p-3 text-center transition ${
                isLockedIn
                  ? "border-green-400 bg-green-500/20"
                  : isPending
                  ? "border-green-500 bg-green-500/10"
                  : "border-green-900 hover:border-green-600"
              } ${!bettingOpen || isConfirmed ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <p className="truncate text-xs text-gray-400">{opt.label}</p>
              <p className="mt-1 text-lg font-bold text-white">{opt.odds ?? "—"}</p>
            </button>
          );
        })}
      </div>

      {isConfirmed ? (
        <p className="mt-3 text-xs text-green-400">
          ✓ Bet confirmed on {options.find((o) => o.key === userChoice)?.label}
        </p>
      ) : bettingOpen ? (
        <div className="mt-4 flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="Stake ₹"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="w-24 rounded-lg border border-green-700 bg-transparent p-2.5 text-sm text-white outline-none focus:border-green-400"
          />
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              canConfirm
                ? "bg-green-500 text-black hover:bg-green-400"
                : "cursor-not-allowed bg-gray-700 text-gray-400"
            }`}
          >
            Confirm Bet
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-500">Betting is closed for this match.</p>
      )}
    </div>
  );
}
