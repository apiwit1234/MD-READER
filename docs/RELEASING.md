# Releasing MD Reader

Every release published to GitHub Releases is delivered automatically to all
installed apps that have "Automatic updates" enabled (Settings → Updates).

## One-time setup

1. Create a GitHub personal access token with `repo` scope
   (github.com → Settings → Developer settings → Tokens).
2. In PowerShell, set it for the session before publishing:

   ```powershell
   $env:GH_TOKEN = "<your token>"
   ```

## Release steps (every time)

1. Finish the feature branch per [WORKFLOW.md](WORKFLOW.md):

   ```sh
   git checkout main
   git merge --no-ff feat/<name>
   npm run release        # bumps patch version, commits, tags
   git push --follow-tags
   ```

2. Build and publish to GitHub Releases:

   ```powershell
   $env:GH_TOKEN = "<your token>"
   npm run dist -- --publish always
   ```

3. Verify on github.com/apiwit1234/MD-READER/releases that the new release has
   **all three** files — auto-update breaks without `latest.yml`:
   - `MD-Reader-X.Y.Z-x64.exe`
   - `MD-Reader-X.Y.Z-x64.exe.blockmap`
   - `latest.yml`

4. electron-builder creates the release as a **draft** — publish it. Users
   receive it automatically (checked ~10 s after app launch; downloads in the
   background; installs when the app is closed).

## How users get the update

- **Automatic updates ON (default):** nothing to do. A toast appears when the
  update is downloaded; it installs on the next app restart.
- **Automatic updates OFF:** Settings → Updates → "Check for updates", or
  download the new installer from GitHub Releases and run it. Reinstalling
  never touches user data (settings live in `%APPDATA%`).

## Notes

- Builds are unsigned: Windows SmartScreen may warn on the FIRST manual
  install. Silent auto-updates applied by an already-installed app do not
  show that warning.
- Never delete `latest.yml` from a release; installed apps poll it.
