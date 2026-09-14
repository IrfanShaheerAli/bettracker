import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import MatchCard from "@/components/MatchCard";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#071A12]">

      <Navbar />

      <Hero />

      {/* Featured Matches */}

      <section className="mx-auto mt-20 max-w-7xl px-6">

        <h2 className="mb-10 text-4xl font-bold text-white">
          Upcoming Matches
        </h2>

        <div className="grid gap-8 md:grid-cols-3">

          {/*<MatchCard
            teamA="Argentina 🇦🇷"
            teamB="Brazil 🇧🇷"
            date="Tomorrow"
            oddsA={1.82}
            oddsB={2.30}
          />

          <MatchCard
            teamA="Germany 🇩🇪"
            teamB="France 🇫🇷"
            date="Friday"
            oddsA={2.10}
            oddsB={1.90}
          />

          <MatchCard
            teamA="England 🏴"
            teamB="Spain 🇪🇸"
            date="Sunday"
            oddsA={2.25}
            oddsB={2.40}
          />*/}

        </div>

        {/* Rules */}

        <div className="mt-20">

          <h2 className="mb-8 text-4xl font-bold text-white">
            ⚖ Betting Rules
          </h2>

          <div className="grid gap-6 md:grid-cols-2">

            <div className="rounded-2xl border border-green-800 bg-[#0E231B] p-6">
              <h3 className="text-xl font-semibold text-green-400">
                ✓ Join Before Betting Closes
              </h3>

              <p className="mt-3 text-gray-400">
                Every participant must join before the countdown reaches zero.
              </p>
            </div>

            <div className="rounded-2xl border border-green-800 bg-[#0E231B] p-6">
              <h3 className="text-xl font-semibold text-green-400">
                ✓ One Bet Per Match
              </h3>

              <p className="mt-3 text-gray-400">
                Once a prediction is submitted, it cannot be changed.
              </p>
            </div>

            <div className="rounded-2xl border border-green-800 bg-[#0E231B] p-6">
              <h3 className="text-xl font-semibold text-green-400">
                ✓ Penalty for Missing Bet
              </h3>

              <p className="mt-3 text-gray-400">
                If you join but don't submit a bet before betting closes, a penalty is applied.
              </p>
            </div>

            <div className="rounded-2xl border border-green-800 bg-[#0E231B] p-6">
              <h3 className="text-xl font-semibold text-green-400">
                ✓ Leaderboard Updates Automatically
              </h3>

              <p className="mt-3 text-gray-400">
                Rankings are updated after the match result is declared.
              </p>
            </div>

          </div>

        </div>

      </section>

      <Footer />

    </main>
  );
}