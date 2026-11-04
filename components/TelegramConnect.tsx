"use client";

import { useEffect, useRef, useState } from "react";

type Status = "loading" | "off" | "waiting" | "on";

export default function TelegramConnect({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function isConnected(): Promise<boolean> {
    try {
      const res = await fetch(`/api/telegram/link?userId=${userId}`);
      const data = await res.json();
      return !!data.connected;
    } catch {
      return false;
    }
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    isConnected().then((on) => setStatus(on ? "on" : "off"));
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function connect() {
    setError("");
    const res = await fetch("/api/telegram/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not start the connection.");
      return;
    }

    setLink(data.link);
    setStatus("waiting");
    window.open(data.link, "_blank"); // Telegram is a different site, so this one opens in a new tab

    // Once they press Start in Telegram the bot links them — check every 3 seconds, up to 2 minutes.
    stopPolling();
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries++;
      if (await isConnected()) {
        stopPolling();
        setStatus("on");
      } else if (tries >= 40) {
        stopPolling();
        setStatus("off");
      }
    }, 3000);
  }

  async function disconnect() {
    await fetch("/api/telegram/link", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setStatus("off");
  }

  return (
    <div className="mt-5 max-w-md rounded-xl border border-green-900 bg-[#0E231B]/80 p-4">
      <p className="text-sm font-semibold text-white">🔔 Telegram reminders</p>

      {status === "loading" && <p className="mt-1 text-xs text-gray-500">Checking…</p>}

      {status === "off" && (
        <>
          <p className="mt-1 text-xs text-gray-400">
            Get a message before betting closes on a match you haven&apos;t bet on yet.
          </p>
          <button
            onClick={connect}
            className="mt-3 rounded-lg border border-green-500 px-4 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-500/10"
          >
            Connect Telegram
          </button>
        </>
      )}

      {status === "waiting" && (
        <>
          <p className="mt-1 text-xs text-gray-400">
            Press <span className="font-semibold text-white">Start</span> in Telegram, then come back here.
          </p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-green-400 hover:underline"
          >
            Didn&apos;t open? Tap here →
          </a>
        </>
      )}

      {status === "on" && (
        <>
          <p className="mt-1 text-xs text-green-400">
            ✓ Connected — you&apos;ll get a reminder before betting closes.
          </p>
          <button
            onClick={disconnect}
            className="mt-3 rounded-lg border border-gray-600 px-4 py-2 text-xs font-medium text-gray-300 transition hover:border-red-500 hover:text-red-400"
          >
            Turn off
          </button>
        </>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
