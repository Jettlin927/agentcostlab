import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildZip } from '../../scripts/zip-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(__dirname, '..');

function collectRuntimeFiles() {
  const manifest = JSON.parse(fs.readFileSync(path.join(extRoot, 'manifest.json'), 'utf8'));
  const required = new Set([
    'manifest.json',
    'analyzer.mjs',
    'content-github.js',
    'popup.html',
    'popup.mjs',
    'core/promptLint.mjs',
    'LICENSE',
    'PRIVACY.md',
  ]);

  if (manifest.icons) {
    for (const rel of Object.values(manifest.icons)) required.add(rel);
  }
  if (manifest.action?.default_popup) required.add(manifest.action.default_popup);
  if (manifest.action?.default_icon) {
    for (const rel of Object.values(manifest.action.default_icon)) required.add(rel);
  }
  for (const cs of manifest.content_scripts || []) {
    for (const js of cs.js || []) required.add(js);
  }
  for (const war of manifest.web_accessible_resources || []) {
    for (const res of war.resources || []) required.add(res);
  }

  const entries = [];
  for (const rel of Array.from(required).sort()) {
    const abs = path.join(extRoot, rel);
    if (!fs.existsSync(abs)) {
      throw new Error(`Missing required Chrome extension asset: ${rel}`);
    }
    entries.push({ name: rel, data: fs.readFileSync(abs) });
  }
  return { manifest, entries };
}

/**
 * Sync core files and package the Chrome/Edge Manifest V3 extension into `dist/*.zip`.
 */
export function packageChromeExtension() {
  execFileSync(process.execPath, [path.join(__dirname, 'sync-core.mjs')], { stdio: 'inherit' });
  const { manifest, entries } = collectRuntimeFiles();
  const outDir = path.join(extRoot, 'dist');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `agentcostlab-chrome-v${manifest.version}.zip`);
  const zipBuf = buildZip(entries);
  fs.writeFileSync(outPath, zipBuf);
  console.log(`Packaged Chrome/Edge extension (${entries.length} files, ${zipBuf.length} bytes) -> ${outPath}`);
  return { outPath, fileCount: entries.length, byteLength: zipBuf.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageChromeExtension();
}
