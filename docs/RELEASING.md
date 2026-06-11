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
- **Update (user-approved, never silent):** the app checks ~10 s after
  launch (toggle: Settings → Updates → "Check for updates at startup") and
  shows a bottom-right card — "Update vX available · Update now / Close".
  Nothing downloads or installs without a click. "Update now" downloads the
  delta with a progress bar, then shows an "installing — don't shut down
  your computer" notice while the app restarts itself. Settings → Updates
  has the same manual Check / Download / Restart & Update flow.
- **Portable .exe** (`npm run dist:portable`): no auto-update; download new
  versions manually.
- Settings, fonts and logs live in `%APPDATA%\md-reader` and survive every
  install, update and uninstall.

## Testing updates locally (no GitHub, no code changes)

The feed URL is resolved at runtime: `PAX_UPDATE_URL` env var →
`%APPDATA%\md-reader\update-feed.txt` → GitHub default. To point any
installed build at a local feed:

1. `npm run release:pack`, copy `release/velopack/*` to `C:\temp\paxfeed`,
   install from that Setup.exe.
2. Create the override file (the app uses it on next launch):

   ```powershell
   Set-Content "$env:APPDATA\md-reader\update-feed.txt" 'C:\temp\paxfeed'
   ```

3. Bump the version (`npm version patch --no-git-tag-version`),
   `npm run release:pack` again (same outputDir so the delta chains), copy
   the new artifacts to `C:\temp\paxfeed`.
4. Relaunch the installed app → after ~10 s the bottom-right "Update
   available" card appears → Update now → progress bar → restart notice →
   app relaunches on the new version. Or drive it manually from Settings →
   Updates. Verify settings survive and the terminal works.
5. Clean up: delete the override and the throwaway bump:

   ```powershell
   Remove-Item "$env:APPDATA\md-reader\update-feed.txt"
   git checkout -- package.json package-lock.json
   ```

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
