'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Theme } from '@/types';

type Props = { theme: Theme };

type Bat = { id: number; top: number; size: number; delay: number; duration: number };

function makeBats(): Bat[] {
  return Array.from({ length: 20 }, (_, id) => ({
    id,
    top: 4 + Math.random() * 76,        // vh
    size: 20 + Math.random() * 26,      // px
    delay: Math.random() * 1.8,         // s, staggered launch
    duration: 4.5 + Math.random() * 3,  // s, flight time
  }));
}

/** A single black bat with red eyes, flying left→right once. */
function BatIcon({ size }: { size: number }) {
  return (
    <svg className="bat" width={size} height={size * 0.6} viewBox="0 0 100 60" aria-hidden>
      <path
        fill="#0b0b0f"
        d="M50 20c4-10 12-14 20-12-3 3-3 7-1 10 4-6 11-8 18-6-6 4-8 9-7 15-7-3-14-1-19 4-3 3-6 7-11 12-5-5-8-9-11-12-5-5-12-7-19-4 1-6-1-11-7-15 7-2 14 0 18 6 2-3 2-7-1-10 8-2 16 2 20 12z"
      />
      <circle cx="44" cy="22" r="2.4" fill="#e0143c" />
      <circle cx="56" cy="22" r="2.4" fill="#e0143c" />
    </svg>
  );
}

/**
 * Dracula ambient layer: a flock of bats flies across once each time the theme
 * becomes 'dracula' (switch or app launch already on Dracula). Renders nothing
 * otherwise; pointer-events:none; hidden under prefers-reduced-motion.
 */
export function BatSwarm({ theme }: Props) {
  const active = theme === 'dracula';
  const bats = useMemo(makeBats, []);
  const [flightId, setFlightId] = useState<number | null>(null);
  const playedRef = useRef(false);
  const doneRef = useRef(0);

  // Play once on entering dracula; reset the guard when leaving so re-entry replays.
  useEffect(() => {
    if (active) {
      if (!playedRef.current) {
        playedRef.current = true;
        doneRef.current = 0;
        setFlightId((n) => (n ?? 0) + 1);
      }
    } else {
      playedRef.current = false;
      setFlightId(null);
    }
  }, [active]);

  if (!active || flightId === null) return null;

  const onBatEnd = () => {
    doneRef.current += 1;
    if (doneRef.current >= bats.length) setFlightId(null);
  };

  return (
    <div className="bat-swarm" aria-hidden data-testid="bat-swarm">
      {bats.map((b) => (
        <span
          key={`${flightId}:${b.id}`}
          className="bat-flyer"
          onAnimationEnd={onBatEnd}
          style={{
            top: `${b.top}vh`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        >
          <BatIcon size={b.size} />
        </span>
      ))}
    </div>
  );
}
