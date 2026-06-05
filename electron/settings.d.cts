export type MainSettings = { autoUpdate: boolean; lastRunVersion: string };

export declare const DEFAULTS: MainSettings;

export declare function normalizeSettings(x: unknown): MainSettings;

export declare function createSettingsStore(dir: string): {
  read(): MainSettings;
  write(patch: Partial<MainSettings>): MainSettings;
  file: string;
};
