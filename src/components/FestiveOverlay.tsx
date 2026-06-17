'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Theme } from '@/types';

type Props = {
  theme: Theme;
  /** Number of open tabs; an increase triggers a Santa fly-by ("open in new page"). */
  tabCount: number;
};

type Flake = {
  id: number; left: number; size: number; duration: number;
  delay: number; drift: number; char: string; opacity: number;
};

const SNOW_CHARS = ['❄', '❅', '•']; // ❄ ❅ •

function makeFlakes(): Flake[] {
  return Array.from({ length: 46 }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 6 + Math.random() * 12,
    duration: 6 + Math.random() * 8,
    delay: -Math.random() * 12,
    drift: Math.random() * 60 - 30,
    char: SNOW_CHARS[Math.floor(Math.random() * SNOW_CHARS.length)],
    opacity: 0.5 + Math.random() * 0.5,
  }));
}

/** A gold silhouette of Santa's sleigh pulled by a reindeer, flying left→right. */
function SantaSleigh() {
  return (
    <svg className="festive-santa" viewBox="0 0 200 90" fill="#F8B229" aria-hidden>
      <path d="M96 50 C120 44 130 46 138 50" stroke="#F8B229" strokeWidth="2" fill="none" />
      <ellipse cx="150" cy="50" rx="17" ry="8" />
      <rect x="139" y="56" width="2.6" height="15" rx="1" />
      <rect x="146" y="57" width="2.6" height="17" rx="1" />
      <rect x="156" y="56" width="2.6" height="15" rx="1" />
      <rect x="163" y="57" width="2.6" height="17" rx="1" />
      <path d="M133 46 q-5 -1 -7 3 q5 2 8 -1 z" />
      <path d="M165 47 q7 -3 9 -12 q5 4 3 11 q5 1 7 5 q-9 5 -19 1 z" />
      <path d="M176 33 l-2 -9 m2 9 l4 -7 m-4 7 l-5 -6" stroke="#F8B229" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M34 64 q-2 -14 12 -16 l30 -3 q8 -1 9 6 q1 7 -6 9 l-33 3 q-7 1 -12 1 z" />
      <path d="M34 64 q-7 0 -8 -7 q-1 -5 4 -6" stroke="#F8B229" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M52 46 q3 -12 12 -11 q8 1 7 12 z" />
      <circle cx="60" cy="31" r="4.5" />
      <path d="M55 30 q3 -10 11 -7 q-1 4 -7 7 z" />
      <circle cx="55" cy="30" r="1.8" fill="#fff" />
    </svg>
  );
}

/**
 * Christmas-theme ambient layer: continuous snowfall plus a Santa sleigh that
 * rides across on app open, on every new tab, and at random intervals. Renders
 * nothing for other themes; pointer-events:none; CSS hides it entirely under
 * prefers-reduced-motion.
 */
export function FestiveOverlay({ theme, tabCount }: Props) {
  const active = theme === 'christmas';
  const flakes = useMemo(makeFlakes, []);
  const [santaId, setSantaId] = useState<number | null>(null);
  const prevTabs = useRef(tabCount);

  const flySanta = useCallback(() => setSantaId((n) => (n ?? 0) + 1), []);

  // New tab opened -> sleigh ride.
  useEffect(() => {
    if (active && tabCount > prevTabs.current) flySanta();
    prevTabs.current = tabCount;
  }, [tabCount, active, flySanta]);

  // One ride shortly after the theme activates, then occasional random rides.
  useEffect(() => {
    if (!active) { setSantaId(null); return; }
    const intro = setTimeout(flySanta, 1200);
    const iv = setInterval(() => { if (Math.random() < 0.5) flySanta(); }, 30_000);
    return () => { clearTimeout(intro); clearInterval(iv); };
  }, [active, flySanta]);

  if (!active) return null;

  return (
    <div className="festive-overlay" aria-hidden data-testid="festive-overlay">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="festive-flake"
          style={{
            left: `${f.left}%`,
            fontSize: `${f.size}px`,
            opacity: f.opacity,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            ['--drift' as string]: `${f.drift}px`,
          }}
        >
          {f.char}
        </span>
      ))}
      {santaId !== null && (
        <div key={santaId} onAnimationEnd={() => setSantaId(null)}>
          <SantaSleigh />
        </div>
      )}
    </div>
  );
}
