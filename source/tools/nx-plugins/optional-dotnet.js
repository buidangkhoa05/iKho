const { execSync } = require('node:child_process');

function hasDotnet() {
  try {
    execSync('dotnet --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

module.exports = hasDotnet() ? require('@nx/dotnet') : {};
