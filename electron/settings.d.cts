export type MainSettings = {
  autoUpdate: boolean;
  lastRunVersion: string;
  uiSize: 'small' | 'medium' | 'large';
  contentZoom: number;
  contextMenuAutoHide: boolean;
  fontSource: string;
  fontSplit: boolean;
  fontEnglish: string;
  fontThai: string;
  windowBackground: string;
};

export declare const DEFAULTS: MainSettings;

export declare function normalizeSettings(x: unknown): MainSettings;

export declare function createSettingsStore(dir: string): {
  read(): MainSettings;
  write(patch: Partial<MainSettings>): MainSettings;
  reset(): MainSettings;
  file: string;
};
