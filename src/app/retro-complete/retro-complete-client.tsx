"use client";

import { useMemo } from "react";

const PARTICLE_COLORS = [
  "#FFD700", // gold
  "#FF69B4", // hot pink
  "#00E5FF", // cyan
  "#8200DB", // violet (primary)
  "#00C48C", // teal
  "#FF4757", // red
  "#FFA500", // orange
  "#9B59FF", // violet
];

const PARTICLES_PER_BURST = 18;

/**
 * One firework burst. PARTICLES_PER_BURST particles radiate from the
 * burst's origin in a circle, each with a CSS-driven `firework-burst`
 * animation (defined in src/app/globals.css).
 */
function Burst({
  leftPct,
  topPct,
  delay,
  duration,
  hue,
}: {
  leftPct: number;
  topPct: number;
  delay: number;
  duration: number;
  hue: number;
}) {
  const particles = Array.from({ length: PARTICLES_PER_BURST }, (_, i) => {
    const angle = (i / PARTICLES_PER_BURST) * Math.PI * 2;
    // Slight radius variation per particle for a less perfect circle.
    const radius = 160 + ((i * 13) % 40);
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    const color = PARTICLE_COLORS[(i + hue) % PARTICLE_COLORS.length];
    return { dx, dy, color, key: i };
  });

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
    >
      {particles.map((p) => (
        <span
          key={p.key}
          className="firework-particle"
          style={
            {
              background: p.color,
              boxShadow: `0 0 8px ${p.color}`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              ["--dx" as string]: `${p.dx}px`,
              ["--dy" as string]: `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function RetroCompleteClient({ userName }: { userName: string }) {
  // Deterministic but varied layout: 8 bursts spread across the viewport
  // with staggered delays and durations so the sky feels alive.
  const bursts = useMemo(
    () => [
      { leftPct: 15, topPct: 20, delay: 0.0, duration: 1.8, hue: 0 },
      { leftPct: 82, topPct: 18, delay: 0.4, duration: 2.0, hue: 2 },
      { leftPct: 28, topPct: 62, delay: 0.8, duration: 1.7, hue: 4 },
      { leftPct: 70, topPct: 70, delay: 1.2, duration: 1.9, hue: 6 },
      { leftPct: 50, topPct: 35, delay: 1.6, duration: 1.8, hue: 1 },
      { leftPct: 10, topPct: 80, delay: 2.0, duration: 2.1, hue: 3 },
      { leftPct: 90, topPct: 55, delay: 2.4, duration: 1.7, hue: 5 },
      { leftPct: 45, topPct: 85, delay: 2.8, duration: 2.0, hue: 7 },
    ],
    []
  );

  return (
    <main className="min-h-screen w-full overflow-hidden relative flex flex-col items-center justify-center px-6 py-20 bg-gradient-to-b from-[#0b0820] via-[#1a0b3d] to-[#2a0b57] text-white">
      {/* Fireworks layer — absolutely-positioned bursts, infinite loop. */}
      <div className="absolute inset-0 pointer-events-none">
        {bursts.map((b, i) => (
          <Burst key={i} {...b} />
        ))}
      </div>

      {/* Foreground content */}
      <div className="relative z-10 text-center animate-fade-in">
        <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-4">
          Retro closed
        </p>
        <h1
          className="font-black leading-[0.9] tracking-tight drop-shadow-[0_6px_24px_rgba(255,215,0,0.35)]"
          style={{ fontSize: "clamp(72px, 14vw, 220px)" }}
        >
          Congrats!
        </h1>
        <h2
          className="font-bold mt-2 bg-gradient-to-r from-[#FFD700] via-[#FF69B4] to-[#00E5FF] bg-clip-text text-transparent"
          style={{ fontSize: "clamp(56px, 10vw, 160px)" }}
        >
          You did it!
        </h2>
        <p className="mt-8 text-lg sm:text-xl text-white/70">
          Nice work wrapping up the retro, {userName.split(" ")[0]}.
        </p>

        <div className="mt-12 flex items-center justify-center">
          {/* Single primary CTA — takes the user back to Home where the
              follow-ups they just assigned will be surfaced in the "My
              Actions" section of their dashboard. */}
          <a
            href="/home"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1a0b3d] text-base font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9" />
              <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
            </svg>
            Return to Home
          </a>
        </div>
      </div>
    </main>
  );
}
