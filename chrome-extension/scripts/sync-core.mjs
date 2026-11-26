import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(__dirname, '..');
const sourcePath = path.resolve(extRoot, '..', 'src', 'engine', 'promptLint.mjs');
const targetDir = path.join(extRoot, 'core');
const targetPath = path.join(targetDir, 'promptLint.mjs');
const licenseSrc = path.resolve(extRoot, '..', 'LICENSE');
const licenseDest = path.join(extRoot, 'LICENSE');

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourcePath, targetPath);
if (fs.existsSync(licenseSrc)) {
  fs.copyFileSync(licenseSrc, licenseDest);
}
console.log(`Synced ${sourcePath} -> ${targetPath}`);
