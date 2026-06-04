export declare function safeScope(scope: unknown): string;

export declare function errorFileName(scope: string, date: Date, seq: number): string;

export declare function createErrorFileWriter(
  dir: string,
): (scope: string, message: string) => string | null;
