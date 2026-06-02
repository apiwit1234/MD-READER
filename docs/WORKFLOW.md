# Development Workflow

This repo uses a simple `main` + feature-branch flow with a patch version bump
on every merge.

## Branches

- **`main`** — always holds stable, tested code. Never commit work-in-progress here.
- **`feat/<name>`** — one branch per feature or fix, created off `main`.

## Steps for any new work

1. Start from an up-to-date `main`:

   ```sh
   git checkout main
   git pull            # if a remote is configured
   git checkout -b feat/<short-name>
   ```

2. Implement the change on the feature branch.

3. Run the tests until green:

   ```sh
   npm test
   ```

4. (Optional) verify a release build still packages:

   ```sh
   npm run dist:dir
   ```

5. Merge back into `main` and bump the version:

   ```sh
   git checkout main
   git merge --no-ff feat/<short-name>
   npm run release        # npm version patch: 1.0.0 -> 1.0.1, commits + tags
   ```

## Versioning

- `npm run release` runs `npm version patch`, which:
  - increments the patch number in `package.json`,
  - creates a commit `vX.Y.Z`,
  - creates a matching git tag.
- Use this on **every** merge to `main` so each stable state has a version + tag.
- For larger changes, run `npm version minor` or `npm version major` manually instead.

## Build artifacts

Everything generated (`node_modules/`, `.next/`, `out/`, `dist/`, `build/`,
`release/`, `bin/`, `coverage/`, `*.tsbuildinfo`) is git-ignored — only source
and config are committed.
