// Thin wrapper over the system `git` CLI. Each op runs in a given repo root.
const { execFile } = require('node:child_process');

const DEFAULT_TIMEOUT_MS = 20000;

function run(cwd, args, timeout = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout, windowsHide: true, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = err && typeof err.code === 'number' ? err.code : err ? 1 : 0;
      resolve({ ok: !err, code, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function detect(folderPath) {
  const top = await run(folderPath, ['rev-parse', '--show-toplevel']);
  if (!top.ok) return { isRepo: false, root: null, branch: null };
  const root = top.stdout.trim();
  const head = await run(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return { isRepo: true, root, branch: head.ok ? head.stdout.trim() : null };
}

// Git refs/branch names may never start with '-' (git itself forbids it), so
// rejecting leading-dash values prevents an argument from being read as a flag.
function badRef(v) {
  return typeof v !== 'string' || v.length === 0 || v.startsWith('-');
}
const refError = { ok: false, code: 1, stdout: '', stderr: 'invalid ref' };

const status = (root) => run(root, ['status', '--porcelain=v1', '-b', '-z']);
const branches = (root) => run(root, ['branch', '-a']);
const diff = (root, p, staged) =>
  run(root, ['diff', ...(staged ? ['--cached'] : []), '--', p]);
const stage = (root, paths) => run(root, ['add', '--', ...paths]);
const unstage = (root, paths) => run(root, ['reset', '-q', 'HEAD', '--', ...paths]);
const discard = (root, paths) => run(root, ['restore', '--', ...paths]);
const commit = (root, message) => run(root, ['commit', '-m', message]);
const checkout = (root, branch) =>
  badRef(branch) ? Promise.resolve(refError) : run(root, ['checkout', branch]);
const createBranch = (root, name, from) =>
  badRef(name) || (from && badRef(from)) ? Promise.resolve(refError)
    : run(root, ['checkout', '-b', name, ...(from ? [from] : [])]);
const merge = (root, branch) =>
  badRef(branch) ? Promise.resolve(refError) : run(root, ['merge', branch]);
const fetch = (root) => run(root, ['fetch', '--all', '--prune'], 60000);
const pull = (root) => run(root, ['pull'], 60000);
const push = (root) => run(root, ['push'], 60000);
async function sync(root) {
  const pulled = await pull(root);
  if (!pulled.ok) return pulled;
  return push(root);
}

module.exports = {
  detect, status, branches, diff, stage, unstage, discard,
  commit, checkout, createBranch, merge, fetch, pull, push, sync,
};
