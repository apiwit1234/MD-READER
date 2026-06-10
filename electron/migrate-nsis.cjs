'use strict';
const path = require('node:path');

const SETUP_URL = 'https://github.com/apiwit1234/MD-READER/releases/latest/download/PAXReader-win-Setup.exe';
const NSIS_UNINSTALLER = 'Uninstall PAX Reader.exe';

/**
 * Classify how this copy of the app is installed:
 * - velopack: exe lives in <root>\current\ with <root>\Update.exe beside it
 * - nsis: the NSIS uninstaller sits next to the exe
 * - none: portable / dev
 * existsFn is injected for tests (production passes fs.existsSync).
 */
function detectInstallKind(exePath, existsFn) {
  const exeDir = path.dirname(exePath);
  const parent = path.dirname(exeDir);
  if (path.basename(exeDir).toLowerCase() === 'current' &&
      existsFn(path.join(parent, 'Update.exe'))) return 'velopack';
  if (existsFn(path.join(exeDir, NSIS_UNINSTALLER))) return 'nsis';
  return 'none';
}

/** Pure data: what the migration runner must do, in order. */
function buildMigrationPlan(nsisInstallDir) {
  return {
    setupUrl: SETUP_URL,
    setupArgs: ['--silent'],
    uninstallExe: path.join(nsisInstallDir, NSIS_UNINSTALLER),
    uninstallArgs: ['/S'],
  };
}

module.exports = { detectInstallKind, buildMigrationPlan, SETUP_URL };
