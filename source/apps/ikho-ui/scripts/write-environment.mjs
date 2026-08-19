#!/usr/bin/env node
// Writes environment.prod.ts from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY before the production
// build runs, so the key never needs to be committed to source control. Safe to run with the
// env var unset — falls back to the existing empty-string placeholder.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetPath = resolve(__dirname, '../src/environments/environment.prod.ts');
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

const escaped = publishableKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const contents = `export const environment = {
  production: true,
  clerkPublishableKey: '${escaped}',
};
`;

writeFileSync(targetPath, contents);
console.log(`wrote environment.prod.ts (clerkPublishableKey ${publishableKey ? 'set' : 'empty'})`);
