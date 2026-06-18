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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="festive-santa" src="/festive/santa-sleigh.png" alt="" aria-hidden draggable={false} />
        </div>
      )}
    </div>
  );
}
