import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(__dirname, '..');
const sourcePath = path.resolve(extRoot, '..', 'src', 'engine', 'promptLint.mjs');
const targetDir = path.join(extRoot, 'core');
const targetPath = path.join(targetDir, 'promptLint.mjs');

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourcePath, targetPath);
console.log(`Synced ${sourcePath} -> ${targetPath}`);
