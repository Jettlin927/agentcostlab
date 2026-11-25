import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pkgRoot, '..', '..');

const copies = [
  ['bin/agentcost-lint.mjs', 'bin/agentcost-lint.mjs'],
  ['src/engine/promptLint.mjs', 'src/engine/promptLint.mjs'],
  ['src/engine/promptLint.d.mts', 'src/engine/promptLint.d.mts'],
  ['LICENSE', 'LICENSE'],
];

for (const [srcRel, destRel] of copies) {
  const srcPath = path.join(repoRoot, srcRel);
  const destPath = path.join(pkgRoot, destRel);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`Synced ${srcPath} -> ${destPath}`);
}
