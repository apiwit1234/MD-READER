/** True when the configured default folder should be auto-opened at launch. */
export function shouldAutoOpenDefaultFolder(
  defaultFolder: string | null,
  openedFolders: { hostPath: string }[],
): boolean {
  if (!defaultFolder) return false;
  return !openedFolders.some((f) => f.hostPath === defaultFolder);
}
