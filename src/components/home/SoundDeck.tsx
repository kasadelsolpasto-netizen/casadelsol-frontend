"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BPM, rave, subscribe, toggle } from "@/lib/rave-engine";
import { HOME_TEXT_DEFAULTS, type HomeTexts } from "@/lib/home-texts";

type DeckTexts = Pick<HomeTexts, "soundOn" | "soundOff" | "soundHintIdle" | "soundHintPointer" | "soundHintTilt" | "dockIdle" | "dockPlaying">;

const usePlaying = () => useSyncExternalStore(subscribe, () => rave.playing, () => false);

/** Botón para prender la rave. Variante `hero` (grande) o `dock` (fija, esquina). */
export function SoundDeck({ variant = "dock", texts = HOME_TEXT_DEFAULTS }: { variant?: "hero" | "dock"; texts?: DeckTexts }) {
  const playing = usePlaying();
  const [coarse, setCoarse] = useState(false);

  useEffect(() => setCoarse(window.matchMedia("(pointer: coarse)").matches), []);

  const onClick = async () => {
    // iOS: el giroscopio requiere permiso explícito dentro de un gesto del usuario
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (!rave.playing && DOE && typeof DOE.requestPermission === "function") {
      try { await DOE.requestPermission(); } catch {}
    }
    await toggle();
  };

  const hint = coarse ? texts.soundHintTilt : texts.soundHintPointer;

  const bars = (
    <span className="flex items-end gap-[2px] h-4" aria-hidden="true">
      {[0.9, 0.5, 1, 0.7, 0.4].map((k, i) => (
        <span
          key={i}
          className="eq-bar w-[3px] bg-current"
          style={{ ["--k" as string]: k } as React.CSSProperties}
        />
      ))}
    </span>
  );

  if (variant === "hero") {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onClick}
          aria-pressed={playing}
          className={`deck-btn group relative inline-flex items-center gap-3 self-start rounded-xl px-5 py-3 font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.2em] transition-all ${
            playing
              ? "bg-neon-green text-black shadow-[0_0_30px_rgba(57,255,20,0.6)]"
              : "border border-neon-green/60 text-neon-green bg-black/60 backdrop-blur hover:bg-neon-green hover:text-black hover:shadow-[0_0_30px_rgba(57,255,20,0.6)]"
          }`}
        >
          {playing ? bars : <span aria-hidden="true">▶</span>}
          {playing ? texts.soundOff : texts.soundOn}
          <span className="font-normal opacity-60">{BPM} bpm</span>
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          {playing ? hint : texts.soundHintIdle}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={playing}
      aria-label={playing ? texts.soundOff : texts.soundOn}
      data-deck="dock"
      className={`fixed z-[80] bottom-6 left-4 md:left-6 inline-flex items-center justify-center gap-2 rounded-full w-12 sm:w-auto sm:px-4 h-12 font-mono text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur transition-all ${
        playing
          ? "bg-neon-green text-black shadow-[0_0_20px_rgba(57,255,20,0.5)]"
          : "bg-black/70 text-neon-green border border-neon-green/40 hover:border-neon-green"
      }`}
    >
      {playing ? bars : <span aria-hidden="true">▶</span>}
      <span className="hidden sm:inline">{playing ? texts.dockPlaying : texts.dockIdle}</span>
    </button>
  );
}
