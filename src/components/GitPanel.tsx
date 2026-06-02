'use client';
import { useGitStore, splitFiles } from '@/lib/git-store';
import type { GitRepo, GitFileStatus } from '@/types';
import { RepoSelector } from './RepoSelector';
import { BranchMenu } from './BranchMenu';
import { GitFileRow } from './GitFileRow';
import { CommitBox } from './CommitBox';

type Props = {
  repos: GitRepo[];
  activeRoot: string | null;
  onSelectRepo: (root: string) => void;
  onOpenDiff: (root: string, file: GitFileStatus, staged: boolean) => void;
};

export function GitPanel({ repos, activeRoot, onSelectRepo, onOpenDiff }: Props) {
  const git = useGitStore(activeRoot);
  const files = git.status?.files ?? [];
  const { staged, unstaged, conflicts } = splitFiles(files);

  return (
    <div className="relative flex h-full flex-col bg-surface text-fg">
      {git.busyLabel && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-bg/60 text-xs text-fg backdrop-blur-[1px]">
          <Spinner />
          <span>{git.busyLabel}</span>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-border px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Source Control</span>
        <button type="button" aria-label="Refresh git status" onClick={() => void git.refresh()} className="text-muted hover:text-fg">⟳</button>
      </div>

      <div className="space-y-1 border-b border-border p-2">
        <RepoSelector repos={repos} activeRoot={activeRoot} onSelect={onSelectRepo} />
        <BranchMenu
          branches={git.branches}
          ahead={git.status?.ahead ?? 0}
          behind={git.status?.behind ?? 0}
          onCheckout={(b) => void git.checkout(b)}
          onCreate={(n) => void git.createBranch(n)}
          onMerge={(b) => void git.merge(b)}
        />
        <div className="flex gap-1">
          <ActionBtn label="Fetch" onClick={() => void git.fetch()} busy={git.busy} />
          <ActionBtn label="Pull" onClick={() => void git.pull()} busy={git.busy} />
          <ActionBtn label="Push" onClick={() => void git.push()} busy={git.busy} />
          <ActionBtn label="Sync" onClick={() => void git.sync()} busy={git.busy} />
        </div>
        {git.lastError && (
          <div className="max-h-24 overflow-y-auto whitespace-pre-wrap rounded bg-rose-100 px-2 py-1 text-[11px] text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
            {git.lastError}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!activeRoot && <div className="px-2 py-3 text-xs text-muted">Open a folder that is a git repository.</div>}
        {conflicts.length > 0 && (
          <Group title={`Merge Changes (${conflicts.length})`}>
            {conflicts.map((f) => (
              <GitFileRow key={f.path} file={f} staged={false}
                onOpenDiff={(file) => activeRoot && onOpenDiff(activeRoot, file, false)}
                onStage={(file) => void git.stage([file.path])} />
            ))}
          </Group>
        )}
        <Group title={`Staged Changes (${staged.length})`}>
          {staged.map((f) => (
            <GitFileRow key={f.path} file={f} staged
              onOpenDiff={(file) => activeRoot && onOpenDiff(activeRoot, file, true)}
              onUnstage={(file) => void git.unstage([file.path])} />
          ))}
        </Group>
        <Group title={`Changes (${unstaged.length})`}>
          {unstaged.map((f) => (
            <GitFileRow key={f.path} file={f} staged={false}
              onOpenDiff={(file) => activeRoot && onOpenDiff(activeRoot, file, false)}
              onStage={(file) => void git.stage([file.path])}
              onDiscard={(file) => { if (window.confirm(`Discard changes to ${file.path}?`)) void git.discard([file.path]); }} />
          ))}
        </Group>
      </div>

      <CommitBox
        stagedCount={staged.length}
        busy={git.busy}
        onCommit={(m) => void git.commit(m)}
        onCommitAndPush={async (m) => { const r = await git.commit(m); if (r.ok) void git.push(); }}
      />
    </div>
  );
}

function ActionBtn({ label, onClick, busy }: { label: string; onClick: () => void; busy: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className="flex-1 rounded border border-border px-1 py-1 text-[11px] text-fg hover:bg-surface-2 disabled:opacity-40">{label}</button>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">{title}</div>
      {children}
    </div>
  );
}
