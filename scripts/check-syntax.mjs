#!/usr/bin/env node
// Syntax gate: run `node --check` on every .mjs file under src/ and tests/.
// Zero dependencies, Node.js built-ins only.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function collect(dir, found) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, found);
    else if (entry.isFile() && entry.name.endsWith('.mjs')) found.push(full);
  }
  return found;
}

const files = ['src', 'tests'].flatMap((root) => collect(path.join(repoRoot, root), []));
if (files.length === 0) {
  console.error('check-syntax: no .mjs files found under src/ or tests/');
  process.exit(1);
}
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: ['ignore', 'ignore', 'inherit'] });
  } catch {
    console.error(`check-syntax: syntax check failed for ${path.relative(repoRoot, file)}`);
    process.exit(1);
  }
}
console.log(`check-syntax: ${files.length} file(s) passed node --check`);
