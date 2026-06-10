'use client';
import { useEffect, useState } from 'react';
import type { Theme } from '@/types';
import { getApi, hasApi, type AppSettings, type CustomFont } from '@/lib/electron-api';
import { AppearanceSection } from './settings/AppearanceSection';
import { FontsSection } from './settings/FontsSection';
import { BehaviorSection } from './settings/BehaviorSection';
import { UpdatesSection } from './settings/UpdatesSection';
import { AdvancedSection } from './settings/AdvancedSection';
import { MousePointer, Palette, RefreshCw, Type, Wrench, X, type LucideIcon } from 'lucide-react';

type SettingsCategory = 'appearance' | 'fonts' | 'behavior' | 'updates' | 'advanced';

const CATEGORIES: { id: SettingsCategory; label: string; icon: LucideIcon }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'fonts', label: 'Fonts', icon: Type },
  { id: 'behavior', label: 'Behavior', icon: MousePointer },
  { id: 'updates', label: 'Updates', icon: RefreshCw },
  { id: 'advanced', label: 'Advanced', icon: Wrench },
];

type Props = {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  favorites: [Theme, Theme];
  onSelectTheme: (theme: Theme) => void;
  onSetFavorites: (favorites: [Theme, Theme]) => void;
  settings: AppSettings | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  customFonts: CustomFont[];
  onCustomFontsChanged: (fonts: CustomFont[]) => void;
  onResetDefaults: () => void;
};

export function SettingsModal({
  open,
  onClose,
  theme,
  favorites,
  onSelectTheme,
  onSetFavorites,
  settings,
  onUpdateSettings,
  customFonts,
  onCustomFontsChanged,
  onResetDefaults,
}: Props) {
  const [category, setCategory] = useState<SettingsCategory>('appearance');
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (open && hasApi()) {
      void getApi().app.versionInfo().then((i) => setAppVersion(i.current));
    }
    if (!open) setCategory('appearance');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-[fadeIn_150ms_var(--ease)]"
      onClick={onClose}
    >
      <div
        className="panel-float flex h-[min(70vh,640px)] w-full max-w-3xl overflow-hidden text-fg animate-[popIn_180ms_var(--ease)]"
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-border p-2">
          <div className="px-2 pb-2 pt-1 text-sm font-semibold">
            Settings
            {appVersion && (
              <span className="ml-1.5 align-middle text-xs font-normal text-muted" title="App version">v{appVersion}</span>
            )}
          </div>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={[
                'flex items-center gap-2 rounded-theme px-2 py-1.5 text-left text-sm',
                category === c.id ? 'bg-accent-soft font-medium text-accent' : 'text-fg hover:bg-surface-2',
              ].join(' ')}
            >
              <c.icon className="h-4 w-4" aria-hidden /> {c.label}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-end border-b border-border px-3 py-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="rounded-theme p-1 text-muted hover:bg-surface-2"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {category === 'appearance' && (
              <AppearanceSection
                theme={theme}
                favorites={favorites}
                onSelectTheme={onSelectTheme}
                onSetFavorites={onSetFavorites}
                settings={settings}
                onUpdateSettings={onUpdateSettings}
              />
            )}
            {category === 'fonts' && (
              <FontsSection
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                customFonts={customFonts}
                onCustomFontsChanged={onCustomFontsChanged}
              />
            )}
            {category === 'behavior' && (
              <BehaviorSection settings={settings} onUpdateSettings={onUpdateSettings} />
            )}
            {category === 'updates' && (
              <UpdatesSection settings={settings} onUpdateSettings={onUpdateSettings} />
            )}
            {category === 'advanced' && <AdvancedSection onResetDefaults={onResetDefaults} />}
          </div>
        </div>
      </div>
    </div>
  );
}
