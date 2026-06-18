'use client';
import { useState } from 'react';
import { getApi, hasApi, type AppSettings, type CustomFont } from '@/lib/electron-api';
import { BUILTIN_FONTS } from '@/lib/fonts';
import { ToggleSwitch } from './ToggleSwitch';

type Props = {
  settings: AppSettings | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  customFonts: CustomFont[];
  onCustomFontsChanged: (fonts: CustomFont[]) => void;
};

export function FontsSection({ settings, onUpdateSettings, customFonts, onCustomFontsChanged }: Props) {
  const [error, setError] = useState<string | null>(null);
  const allFonts = [...BUILTIN_FONTS, ...customFonts];
  const split = settings?.fontSplit ?? false;

  async function addFont() {
    setError(null);
    const r = await getApi().fonts.add();
    if (!r.ok) {
      if (r.error) setError(r.error);
      return;
    }
    onCustomFontsChanged(await getApi().fonts.list());
  }

  async function removeFont(id: string) {
    await getApi().fonts.remove(id);
    // Deselect everywhere the removed font was used.
    const patch: Partial<AppSettings> = {};
    if (settings?.fontSource === id) patch.fontSource = 'default';
    if (settings?.fontEnglish === id) patch.fontEnglish = 'default';
    if (settings?.fontThai === id) patch.fontThai = 'default';
    if (Object.keys(patch).length > 0) onUpdateSettings(patch);
    onCustomFontsChanged(await getApi().fonts.list());
  }

  function fontSelect(label: string, value: string, key: 'fontSource' | 'fontEnglish' | 'fontThai') {
    return (
      <label className="flex-1 rounded-theme border border-border p-2.5 text-sm">
        <span className="block text-[0.625rem] uppercase tracking-wide text-muted">{label}</span>
        <select
          aria-label={label}
          value={value}
          disabled={!settings}
          onChange={(e) => onUpdateSettings({ [key]: e.target.value } as Partial<AppSettings>)}
          className="mt-1 w-full bg-transparent font-medium text-fg outline-none"
        >
          {allFonts.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Reading font</div>
      <p className="mb-3 text-xs text-muted">
        Applies to the markdown reading view only. Code and terminal keep monospace fonts.
      </p>

      {!split && <div className="flex">{fontSelect('Font', settings?.fontSource ?? 'default', 'fontSource')}</div>}

      <label className="mt-3 flex items-center justify-between rounded-theme border border-border p-2.5 text-sm">
        <span>
          Separate Thai / English fonts
          <span className="block text-xs text-muted">For fonts that only cover one language</span>
        </span>
        <ToggleSwitch
          aria-label="Separate Thai / English fonts"
          checked={split}
          disabled={!settings}
          onChange={(v) => onUpdateSettings({ fontSplit: v })}
        />
      </label>

      {split && (
        <div className="mt-3 flex gap-2.5">
          {fontSelect('English font', settings?.fontEnglish ?? 'default', 'fontEnglish')}
          {fontSelect('Thai font', settings?.fontThai ?? 'default', 'fontThai')}
        </div>
      )}

      <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Custom fonts</div>
      <div className="rounded-theme border border-border p-2.5 text-sm">
        {customFonts.length === 0 && (
          <p className="text-xs text-muted">No custom fonts yet. TTF, OTF, WOFF and WOFF2 are supported.</p>
        )}
        {customFonts.map((f) => (
          <div key={f.id} className="flex items-center justify-between py-1">
            <span className="truncate">{f.label}</span>
            <button
              type="button"
              aria-label={`Remove font ${f.label}`}
              onClick={() => { void removeFont(f.id); }}
              className="shrink-0 rounded-theme border border-border px-2 py-0.5 text-xs text-fg hover:bg-surface-2"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={!hasApi()}
          onClick={() => { void addFont(); }}
          className="mt-2 rounded-theme border border-border px-2 py-1 text-xs text-fg hover:bg-surface-2 disabled:opacity-40"
        >
          + Add font…
        </button>
        {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
      </div>
    </div>
  );
}
