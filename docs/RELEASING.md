# Releasing PAX Reader (Velopack)

Releases publish to GitHub Releases as Velopack packages. Installed apps
download only a small **delta patch** (typically 1–10 MB) and apply it on
restart — no installer re-run. End users never need any tools installed.

## One-time setup (developer machine)

1. Install the .NET SDK (8+), then the vpk CLI:

   ```powershell
   dotnet tool install -g vpk
   ```

2. Create a GitHub personal access token with `repo` scope and set it for the
   session before publishing:

   ```powershell
   $env:GITHUB_TOKEN = "<your token>"
   ```

## Release steps (every time)

1. Finish the feature branch per [WORKFLOW.md](WORKFLOW.md):

   ```sh
   git checkout main
   git merge --no-ff feat/<name>
   npm run release        # bumps patch version, commits, tags
   git push --follow-tags
   ```

2. Pack and publish:

   ```powershell
   $env:GITHUB_TOKEN = "<your token>"
   npm run release:publish
   ```

   This runs `electron-builder --dir` (unpacked app under
   `release/win-unpacked`), wraps it with `vpk pack` into
   `release/velopack/`, and uploads to GitHub Releases.

   **Keep `release/velopack/` between releases** — vpk diffs against the
   previous full package found there to generate the delta. If it's empty
   (fresh clone), download the previous release's `.nupkg` first with
   `vpk download github --repoUrl https://github.com/apiwit1234/MD-READER --outputDir release/velopack`.

3. Verify the GitHub release contains:
   - `PAXReader-win-Setup.exe` (new-user installer, self-contained)
   - `PAXReader-<version>-full.nupkg`
   - `PAXReader-<version>-delta.nupkg` (absent only on the very first release)
   - `RELEASES`

## How users install and update

- **Install:** download `PAXReader-win-Setup.exe` from GitHub Releases and
  run it. No prerequisites, no admin rights. Installs to
  `%LOCALAPPDATA%\PAXReader`.
- **Update (automatic, default):** the app checks ~10 s after launch,
  downloads the delta in the background, and shows a toast. "Restart &
  Update" applies it immediately; otherwise it applies automatically on the
  next launch. Settings → Updates has a manual Check / Download / Restart
  flow with a progress bar.
- **Portable .exe** (`npm run dist:portable`): no auto-update; download new
  versions manually.
- Settings, fonts and logs live in `%APPDATA%\md-reader` and survive every
  install, update and uninstall.

## Testing updates locally (no GitHub)

`UpdateManager` accepts a local directory as the feed:

1. `npm run release:pack`, copy `release/velopack/*` to `C:\temp\paxfeed`,
   install from that Setup.exe.
2. Temporarily point `UPDATE_URL` in `electron/updater.cjs` to
   `C:\\temp\\paxfeed`, bump the version
   (`npm version patch --no-git-tag-version`), make a visible change,
   `npm run release:pack` again (same outputDir so the delta chains), copy
   the new artifacts to `C:\temp\paxfeed`.
3. In the installed app: Settings → Updates → Check → Download (progress
   bar) → Restart & Update. Verify settings survive and the terminal works.
4. Revert `UPDATE_URL` and the throwaway version bump.

## Rollback

Velopack updates forward only: to roll back, re-publish the previous code as
a NEW higher version.

## Notes

- Builds are unsigned: Windows SmartScreen may warn on the FIRST manual
  install. Delta updates applied by an installed app do not show that warning.
- Migration from the old NSIS installs (≤ v1.0.x): the migration release
  publishes BOTH the final NSIS artifacts (`npm run dist -- --publish always`,
  needs `$env:GH_TOKEN`) and the Velopack artifacts in the same tagged
  release. Old installs auto-update to it via electron-updater, then show a
  one-click "Upgrade" prompt that installs the Velopack copy and removes the
  NSIS one. After that release ships, the NSIS/zip targets and `publish`
  block in package.json can be removed.
