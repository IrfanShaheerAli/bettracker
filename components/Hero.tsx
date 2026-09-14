"use client";

import { useState } from "react";
import JoinModal from "./JoinModal";

export default function Hero() {

  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mx-auto mt-8 flex max-w-6xl flex-col items-center px-6 text-center">

      {/* Status Badge */}

      <div className="rounded-full border border-green-700 bg-green-900/20 px-6 py-3 text-green-400">
        🟢 BETTING OPEN
      </div>

      {/* Match */}

      <h1 className="mt-8 text-4xl font-extrabold text-white md:text-6xl">
        India <span className="text-3xl">🇮🇳</span>

        <span className="mx-6 text-green-400">
          VS
        </span>

        Pakistan <span className="text-3xl">🇵🇰</span>
      </h1>

      <p className="mt-5 text-2xl text-gray-300">
        ICC Champions Trophy
      </p>

      <p className="mt-4 text-xl text-green-400">
        Betting Closes In
      </p>

      <h2 className="mt-2 text-3xl font-bold text-white">
        02 : 13 : 41
      </h2>

      {/* Divider */}

      <div className="mt-8 h-px w-full bg-green-900"></div>

      {/* Odds */}

      <div className="mt-8 grid w-full gap-6 md:grid-cols-3">

        <div className="rounded-2xl border border-green-800 bg-[#0E231B] py-6 px-6">

          <p className="text-gray-400">
            🇮🇳 India
          </p>

          <h2 className="mt-3 text-4xl font-bold text-white">
            1.82
          </h2>

        </div>

        <div className="rounded-2xl border border-green-800 bg-[#0E231B] py-6 px-6">

          <p className="text-gray-400">
            🤝 Draw
          </p>

          <h2 className="mt-3 text-4xl font-bold text-white">
            3.20
          </h2>

        </div>

        <div className="rounded-2xl border border-green-800 bg-[#0E231B] py-6 px-6">

          <p className="text-gray-400">
            🇵🇰 Pakistan
          </p>

          <h2 className="mt-3 text-4xl font-bold text-white">
            2.15
          </h2>

        </div>

      </div>

      {/* Divider */}

      <div className="mt-8 h-px w-full bg-green-900"></div>
      {/* Buttons */}

      <div className="mt-8 flex gap-6">

        <button
          onClick={() => setIsOpen(true)}
          className="rounded-xl border border-green-500 px-8 py-4 font-semibold text-green-400 transition hover:bg-green-500 hover:text-black"
        >
          Join Match
        </button>

        <button className="rounded-xl border border-green-500 px-8 py-4 font-semibold text-green-400 transition hover:bg-green-500 hover:text-black">
          Place Bet
        </button>

      </div>

      <JoinModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />

    </section>
  );
}