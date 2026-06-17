# Releasing PAX Reader (Velopack)

Releases publish to GitHub Releases as Velopack packages. Installed apps
download only a small **delta patch** (typically 1–10 MB) and apply it on
restart — no installer re-run. End users never need any tools installed.

## One-time setup (developer machine)

1. Install the .NET SDK (8+), then the vpk CLI:

   ```powershell
   dotnet tool install -g vpk
   ```

2. A GitHub token with `repo` scope. You do **not** need to type or paste it:
   `scripts/release.ps1` uses `$env:GITHUB_TOKEN`/`$env:GH_TOKEN` if set,
   otherwise reads the credential Git Credential Manager already stored when
   you first `git push`ed (Windows Credential Manager entry
   `git:https://github.com`). So once `git push` works, the release script is
   authenticated automatically.

## Release steps (every time)

1. Finish the feature branch per [WORKFLOW.md](WORKFLOW.md), then bump + push:

   ```sh
   git checkout main
   git merge --no-ff feat/<name>
   npm version minor        # or `patch`; commits + tags vX.Y.Z
   git push --follow-tags
   ```

2. Build both update channels and publish, in one command:

   ```powershell
   npm run release:publish
   ```

   This runs `scripts/release.ps1`, which:
   - cleans `release/`, runs `npm run dist` (NSIS + portable + zip +
     `latest.yml`), then `vpk pack` (Velopack `Setup.exe` + full `.nupkg` +
     `RELEASES`);
   - creates **one published** GitHub release for the current tag and uploads
     **every** asset itself via the GitHub API — retrying transient TLS resets
     and verifying each asset's byte size;
   - verifies `/releases/latest` resolves to this version and that both
     `latest.yml` (electron-updater) and `RELEASES` (Velopack) reference it.

   > Why a script and not `electron-builder --publish` + `vpk upload`? Using
   > both tools' publishers against one tag races on draft-vs-published state.
   > A single API publisher is deterministic. This is how `v1.1.0` shipped.

   On a network drop mid-upload, just re-run `npm run release:publish` — it
   skips assets already on the release and retries the rest. The script does a
   full rebuild each run; that's intentional and safe.

3. The script fails loudly if anything is missing. A good release has 8 assets:
   `latest.yml`, `PAX-Reader-<version>-x64.exe` (+ `.blockmap`, `.zip`,
   `-portable.exe`), `PAXReader-win-Setup.exe`, `PAXReader-<version>-full.nupkg`,
   `RELEASES`. Delta `.nupkg`s appear automatically once a prior full package
   exists in the release feed.

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
- Migration from the old NSIS installs (≤ v1.0.x) shipped in **v1.1.0**: that
  release carries BOTH the NSIS artifacts (`latest.yml` + installer) and the
  Velopack artifacts. Old installs auto-update to it via electron-updater,
  then show a one-click "Upgrade" prompt that installs the Velopack copy and
  removes the NSIS one. `scripts/release.ps1` always builds and uploads both
  sets, so every release keeps the NSIS channel alive for any installs still
  on the electron-updater path. Once you're confident no NSIS-era installs
  remain, the `nsis`/`zip` targets and the `publish` block in package.json can
  be dropped and the NSIS assets removed from `scripts/release.ps1`.
