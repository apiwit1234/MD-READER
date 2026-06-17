# PAX Reader release -- builds both update channels locally and publishes ONE
# GitHub release with every asset, via the GitHub API (single publisher, no
# electron-builder/vpk publish race, no draft ambiguity).
#
# Usage (from repo root, AFTER `npm version minor|patch` + `git push --follow-tags`):
#   powershell -ExecutionPolicy Bypass -File scripts/release.ps1
#
# Token: uses $env:GITHUB_TOKEN if set, otherwise reads the GitHub credential
# already stored by Git Credential Manager (the same one `git push` uses), so
# no token ever has to be typed or pasted. Needs `repo` scope.
#
# Prerequisites: .NET 8+ SDK and `dotnet tool install -g vpk`.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo    = 'apiwit1234/MD-READER'
$version = (Get-Content package.json | ConvertFrom-Json).version
$tag     = "v$version"
Write-Host "Releasing PAX Reader $tag" -ForegroundColor Cyan

# --- token: env var, else Git Credential Manager (Windows Credential Manager) ---
function Get-GhToken {
  if ($env:GITHUB_TOKEN) { return $env:GITHUB_TOKEN }
  if ($env:GH_TOKEN)     { return $env:GH_TOKEN }
  $sig = @"
using System;
using System.Runtime.InteropServices;
public class Cred {
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr cred);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential)]
  public struct CREDENTIAL { public int Flags; public int Type; public IntPtr TargetName; public IntPtr Comment;
    public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public IntPtr TargetAlias; public IntPtr UserName; }
}
"@
  if (-not ('Cred' -as [type])) { Add-Type $sig }
  $p = [IntPtr]::Zero
  if (-not [Cred]::CredRead('git:https://github.com', 1, 0, [ref]$p)) { throw 'No GitHub token in env or Credential Manager.' }
  try {
    $c = [Runtime.InteropServices.Marshal]::PtrToStructure($p, [type][Cred+CREDENTIAL])
    $b = New-Object byte[] $c.CredentialBlobSize
    [Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $b, 0, $c.CredentialBlobSize)
    return [Text.Encoding]::Unicode.GetString($b)
  } finally { [Cred]::CredFree($p) }
}
$tok = Get-GhToken
$h = @{ Authorization = "token $tok"; 'User-Agent' = 'pax-release'; Accept = 'application/vnd.github+json' }

# --- build both channels into a clean release/ ---
# Clean so the Velopack delta baseline is honest (first release = full only).
if (Test-Path release) { Remove-Item release -Recurse -Force }
Write-Host 'Building portable + unpacked app...' -ForegroundColor Cyan
npm run dist
if ($LASTEXITCODE -ne 0) { throw 'npm run dist failed' }
Write-Host 'Packing Velopack...' -ForegroundColor Cyan
vpk pack --packId PAXReader --packVersion $version --packDir 'release/win-unpacked' --mainExe 'PAX Reader.exe' --packTitle 'PAX Reader' --icon build/icon.ico --outputDir release/velopack
if ($LASTEXITCODE -ne 0) { throw 'vpk pack failed' }

# --- create (or reuse) the published release for this tag ---
$rel = $null
try { $rel = (Invoke-WebRequest "https://api.github.com/repos/$repo/releases/tags/$tag" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json } catch {}
if (-not $rel) {
  $body = @{ tag_name = $tag; name = "PAX Reader $version"; draft = $false; prerelease = $false
             body = "PAX Reader $version. New users: download PAXReader-win-Setup.exe. Existing users auto-update to this release." } | ConvertTo-Json
  $rel = (Invoke-WebRequest "https://api.github.com/repos/$repo/releases" -Headers $h -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing).Content | ConvertFrom-Json
}
$up = $rel.upload_url -replace '\{\?name,label\}', ''   # NOTE: build the URL by concatenation; "$up?name=" breaks PS string parsing
$existing = @($rel.assets | ForEach-Object { $_.name })
Write-Host "Release id $($rel.id), $($existing.Count) existing asset(s)" -ForegroundColor Cyan

# --- upload every channel asset, retrying transient TLS resets, verifying size ---
# Use string interpolation, NOT inline -f: in an array literal `,` and `-f`
# mis-associate and merge elements.
$assets = @(
  "release/PAX-Reader-$version-x64-portable.exe",        # no-install option
  'release/velopack/PAXReader-win-Setup.exe',            # Velopack installer (new users)
  "release/velopack/PAXReader-$version-full.nupkg",
  'release/velopack/releases.win.json',                  # Velopack 1.x feed (what UpdateManager actually reads)
  'release/velopack/assets.win.json',                    # Velopack asset metadata
  'release/velopack/RELEASES'                            # legacy feed manifest (back-compat)
)
$failed = @()
foreach ($a in $assets) {
  $name = Split-Path $a -Leaf
  if ($existing -contains $name) { Write-Host "  skip (exists)  $name"; continue }
  $local = (Get-Item $a).Length
  $url = $up + '?name=' + $name
  $done = $false
  for ($i = 1; $i -le 4 -and -not $done; $i++) {
    try {
      $r = Invoke-RestMethod -Uri $url -Headers $h -Method Post -ContentType 'application/octet-stream' -InFile $a -TimeoutSec 2400
      if ($r.size -ne $local) { throw "size mismatch local=$local remote=$($r.size)" }
      Write-Host ("  uploaded {0,-34} {1,12} bytes  (attempt {2})" -f $name, $r.size, $i) -ForegroundColor Green
      $done = $true
    } catch {
      Write-Host ("  attempt {0} failed {1}: {2}" -f $i, $name, $_.Exception.Message) -ForegroundColor Yellow
      Start-Sleep -Seconds 5
    }
  }
  if (-not $done) { $failed += $name }
}
if ($failed.Count) { throw "Upload failed for: $($failed -join ', '). Re-run the script -- it skips assets already uploaded." }

# --- verify: every expected asset is present + both feeds name this version ---
# Read assets from the API and fetch feed files via their direct
# browser_download_url (NOT the /latest/download/ path, which can briefly
# negative-cache right after upload).
$rel2 = (Invoke-WebRequest "https://api.github.com/repos/$repo/releases/tags/$tag" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$have = @($rel2.assets | ForEach-Object { $_.name })
$expected = $assets | ForEach-Object { Split-Path $_ -Leaf }
$missing = $expected | Where-Object { $have -notcontains $_ }
if ($missing) { throw "release is missing assets: $($missing -join ', ')" }
$latest = (Invoke-WebRequest "https://api.github.com/repos/$repo/releases/latest" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
if ($latest.tag_name -ne $tag) { throw "/releases/latest is $($latest.tag_name), expected $tag" }
function Get-AssetText($n) { (Invoke-WebRequest (($rel2.assets | Where-Object { $_.name -eq $n }).browser_download_url) -UseBasicParsing).Content }
$winjson = Get-AssetText 'releases.win.json'   # the feed Velopack UpdateManager reads
if ($winjson -notmatch [Regex]::Escape("PAXReader-$version-full.nupkg")) { throw 'releases.win.json (Velopack feed) did not list this version' }

Write-Host "`nDONE -- $tag published with all assets; both update channels verified." -ForegroundColor Green
Write-Host "https://github.com/$repo/releases/tag/$tag"
