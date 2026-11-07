"use client";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = now === null ? null : new Date(target).getTime() - now;

  if (diff !== null && diff <= 0) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-[#ff2a2a] shadow-[0_0_6px_#ff2a2a] animate-pulse" />
        on air
      </span>
    );
  }

  const s = diff === null ? 0 : Math.floor(diff / 1000);
  const parts = [
    [Math.floor(s / 86400), "d"],
    [Math.floor((s % 86400) / 3600), "h"],
    [Math.floor((s % 3600) / 60), "m"],
    [s % 60, "s"],
  ] as const;

  return (
    <span className="tabular-nums" suppressHydrationWarning>
      T-
      {parts.map(([v, u], i) => (
        <span key={u}>
          {diff === null ? "--" : pad(v)}
          <span className="text-white/40">{u}</span>
          {i < parts.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
