export type FontEntry = { id: string; label: string };

export type FontAddResult = { ok: boolean; font?: FontEntry; error?: string };

export type FontDataResult = { ok: boolean; bytes?: Buffer; format?: string; error?: string };

export declare const ALLOWED_EXTS: string[];

export declare function fontIdFromFile(fileName: string): string;

export declare function createFontStore(userDataDir: string): {
  list(): FontEntry[];
  addFromPath(srcPath: string): FontAddResult;
  remove(id: string): { ok: boolean };
  data(id: string): FontDataResult;
  dir: string;
};
