import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildZip } from '../../scripts/zip-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(__dirname, '..');

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildContentTypesXml() {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '  <Default Extension=".json" ContentType="application/json"/>',
    '  <Default Extension=".cjs" ContentType="application/javascript"/>',
    '  <Default Extension=".mjs" ContentType="application/javascript"/>',
    '  <Default Extension=".md" ContentType="text/markdown"/>',
    '  <Default Extension=".png" ContentType="image/png"/>',
    '  <Default Extension=".vsixmanifest" ContentType="text/xml"/>',
    '  <Override PartName="/extension/LICENSE" ContentType="text/plain"/>',
    '</Types>',
  ].join('\n');
}

function buildVsixManifest(pkg) {
  const iconRel = `extension/${pkg.icon}`;
  const tags = (pkg.keywords || []).join(',');
  const categories = (pkg.categories || []).join(',');
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">',
    '  <Metadata>',
    `    <Identity Language="en-US" Id="${escapeXml(pkg.name)}" Version="${escapeXml(pkg.version)}" Publisher="${escapeXml(pkg.publisher)}" />`,
    `    <DisplayName>${escapeXml(pkg.displayName)}</DisplayName>`,
    `    <Description xml:space="preserve">${escapeXml(pkg.description)}</Description>`,
    `    <Tags>${escapeXml(tags)}</Tags>`,
    `    <Categories>${escapeXml(categories)}</Categories>`,
    '    <GalleryFlags>Public</GalleryFlags>',
    '    <Properties>',
    `      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${escapeXml(pkg.engines?.vscode || '^1.85.0')}" />`,
    `      <Property Id="Microsoft.VisualStudio.Services.Branding.Color" Value="${escapeXml(pkg.galleryBanner?.color || '#0b1120')}" />`,
    `      <Property Id="Microsoft.VisualStudio.Services.Branding.Theme" Value="${escapeXml(pkg.galleryBanner?.theme || 'dark')}" />`,
    `      <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="${escapeXml(pkg.repository?.url || '')}" />`,
    `      <Property Id="Microsoft.VisualStudio.Services.Links.Support" Value="${escapeXml(pkg.bugs?.url || '')}" />`,
    `      <Property Id="Microsoft.VisualStudio.Services.Links.Learn" Value="${escapeXml(pkg.homepage || '')}" />`,
    '    </Properties>',
    '    <License>extension/LICENSE</License>',
    `    <Icon>${escapeXml(iconRel)}</Icon>`,
    '  </Metadata>',
    '  <Installation>',
    '    <InstallationTarget Id="Microsoft.VisualStudio.Code" />',
    '  </Installation>',
    '  <Dependencies />',
    '  <Assets>',
    '    <Asset Type="Microsoft.VisualStudio.Code.Manifest" d:Source="File" Path="extension/package.json" Addressable="true" />',
    '    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" d:Source="File" Path="extension/README.md" Addressable="true" />',
    '    <Asset Type="Microsoft.VisualStudio.Services.Content.License" d:Source="File" Path="extension/LICENSE" Addressable="true" />',
    `    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" d:Source="File" Path="${escapeXml(iconRel)}" Addressable="true" />`,
    '  </Assets>',
    '</PackageManifest>',
  ].join('\n');
}

/**
 * Sync core files and build a spec-compliant OPC `.vsix` bundle in `dist/`.
 */
export function packageVsCodeExtension() {
  execFileSync(process.execPath, [path.join(__dirname, 'sync-core.mjs')], { stdio: 'inherit' });
  const pkg = JSON.parse(fs.readFileSync(path.join(extRoot, 'package.json'), 'utf8'));
  const required = [
    'package.json',
    'extension.cjs',
    'core/promptLint.mjs',
    pkg.icon,
    'images/screenshot.png',
    'README.md',
    'PRIVACY.md',
    'LICENSE',
  ];

  const entries = [
    { name: '[Content_Types].xml', data: Buffer.from(buildContentTypesXml(), 'utf8') },
    { name: 'extension.vsixmanifest', data: Buffer.from(buildVsixManifest(pkg), 'utf8') },
  ];

  for (const rel of required) {
    const abs = path.join(extRoot, rel);
    if (!fs.existsSync(abs)) {
      throw new Error(`Missing required VS Code extension asset: ${rel}`);
    }
    entries.push({ name: `extension/${rel.replace(/\\/g, '/')}`, data: fs.readFileSync(abs) });
  }

  const outDir = path.join(extRoot, 'dist');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${pkg.name}-${pkg.version}.vsix`);
  const vsixBuf = buildZip(entries);
  fs.writeFileSync(outPath, vsixBuf);
  console.log(`Packaged VS Code/Open VSX extension (${entries.length} entries, ${vsixBuf.length} bytes) -> ${outPath}`);
  return { outPath, fileCount: entries.length, byteLength: vsixBuf.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageVsCodeExtension();
}
