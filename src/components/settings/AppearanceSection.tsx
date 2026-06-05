'use client';
import type { Theme } from '@/types';
import { THEMES } from '@/lib/themes';
import type { AppSettings, UiSize } from '@/lib/electron-api';

type Props = {
  theme: Theme;
  favorites: [Theme, Theme];
  onSelectTheme: (theme: Theme) => void;
  onSetFavorites: (favorites: [Theme, Theme]) => void;
  settings: AppSettings | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
};

const UI_SIZES: { id: UiSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

export function AppearanceSection({ theme, favorites, onSelectTheme, onSetFavorites, settings, onUpdateSettings }: Props) {
  function setFav(slot: 0 | 1, value: Theme) {
    const other = favorites[slot === 0 ? 1 : 0];
    // Prevent both slots holding the same theme: if the new value collides,
    // push the previous value of this slot into the other slot.
    const next: [Theme, Theme] = slot === 0 ? [value, other] : [other, value];
    if (next[0] === next[1]) next[slot === 0 ? 1 : 0] = favorites[slot];
    onSetFavorites(next);
  }

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Theme</div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={`Select ${t.label} theme`}
            aria-pressed={t.id === theme}
            onClick={() => onSelectTheme(t.id)}
            className={[
              'rounded-theme border-2 p-2.5 text-left transition-colors',
              t.id === theme ? 'border-accent' : 'border-border hover:border-muted',
            ].join(' ')}
          >
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <span aria-hidden>{t.icon}</span> {t.label}
            </div>
            <div className="mt-2 flex h-4 overflow-hidden rounded">
              {t.swatch.map((c, i) => (
                <span key={i} className="flex-1" style={{ background: c }} />
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
        Quick-toggle favorites
      </div>
      <div className="flex gap-2.5">
        {([0, 1] as const).map((slot) => (
          <label key={slot} className="flex-1 rounded-theme border border-border p-2.5 text-sm">
            <span className="block text-[10px] uppercase tracking-wide text-muted">
              {`Favorite ${slot + 1}`}
            </span>
            <select
              aria-label={`Favorite ${slot + 1}`}
              value={favorites[slot]}
              onChange={(e) => setFav(slot, e.target.value as Theme)}
              className="mt-1 w-full bg-transparent font-medium text-fg outline-none"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">UI size</div>
      <div className="flex gap-2.5">
        {UI_SIZES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={(settings?.uiSize ?? 'medium') === s.id}
            disabled={!settings}
            onClick={() => onUpdateSettings({ uiSize: s.id })}
            className={[
              'flex-1 rounded-theme border-2 p-2.5 text-sm font-medium disabled:opacity-40',
              (settings?.uiSize ?? 'medium') === s.id ? 'border-accent' : 'border-border hover:border-muted',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Scales the app chrome only — reading text has its own zoom (Behavior).</p>
    </div>
  );
}
