/* Per-error log files: every error becomes its own file in the logs folder so
   the user can pick the relevant ones and send them when reporting a bug.
   No electron imports here so it stays unit-testable. */
const path = require('node:path');
const fsSync = require('node:fs');

function safeScope(scope) {
  return (String(scope || 'error').replace(/[^a-z0-9_-]/gi, '_').slice(0, 40)) || 'error';
}

function errorFileName(scope, date, seq) {
  const stamp = date.toISOString().replace(/[:.]/g, '-');
  return `error-${stamp}-${seq}-${safeScope(scope)}.log`;
}

function createErrorFileWriter(dir) {
  let seq = 0;
  return function writeErrorFile(scope, message) {
    try {
      fsSync.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, errorFileName(scope, new Date(), ++seq));
      fsSync.writeFileSync(file, `[${new Date().toISOString()}] [${scope}]\n${message}\n`, 'utf-8');
      return file;
    } catch {
      // logging must never throw
      return null;
    }
  };
}

module.exports = { createErrorFileWriter, errorFileName, safeScope };
