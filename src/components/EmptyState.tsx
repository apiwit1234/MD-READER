'use client';

type Props = { onOpenFolder: () => void };

export function EmptyState({ onOpenFolder }: Props) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Open a folder to get started</h2>
        <p className="mb-6 text-sm text-muted">
          Pin one or more folders to browse their markdown files side by side.
        </p>
        <button
          type="button"
          onClick={onOpenFolder}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:bg-accent/90"
        >
          + Open folder
        </button>
      </div>
    </div>
  );
}
