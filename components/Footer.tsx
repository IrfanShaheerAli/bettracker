export default function Footer() {
    return (
      <footer className="mt-16 border-t border-green-900 bg-[#071A13]">
  
        <div className="px-16 py-6">
  
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            ⚽ BetTracker
          </h2>
  
          <p className="mt-1 text-sm text-green-400">
            Predict • Compete • Win
          </p>
  
          <p className="mt-3 max-w-xl text-sm text-gray-400">
            Join events, predict match outcomes, compete with friends and climb the leaderboard.
          </p>
  
          <div className="mt-4 h-px w-full bg-green-900"></div>
  
          <p className="mt-4 text-xs text-gray-500">
            © 2026 BetTracker. All Rights Reserved.
          </p>
  
        </div>
  
      </footer>
    );
  }