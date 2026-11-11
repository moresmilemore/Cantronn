// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — BUILD SCRIPT
//  Bundles modular src/ files into self-contained index.html & dist/index.html
// ═══════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

function stripModuleSyntax(code) {
  return code
    // Remove multi-line or single-line import statements
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*/g, '')
    // Replace `export function`, `export const`, `export class` with plain declarations
    .replace(/\bexport\s+(function|const|let|var|class)\b/g, '$1');
}

export function buildProject() {
  const template = fs.readFileSync(path.join(srcDir, 'template.html'), 'utf8');
  const css = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf8');

  const jsModules = [
    'config.js',
    'storage.js',
    'assets.js',
    'voice-bank.js',
    'audio.js',
    'fx.js',
    'game.js',
  ];
  const bundledJsParts = jsModules.map((file) => {
    const raw = fs.readFileSync(path.join(srcDir, file), 'utf8');
    return `// ── Module: ${file} ──\n` + stripModuleSyntax(raw).trim();
  });

  const fullJs = [
    '(function () {',
    '  "use strict";',
    ...bundledJsParts,
    '  window.citrusApp = initCitrusKittenApp();',
    '})();',
  ].join('\n\n');

  const outputHtml = template
    .replace('/* __INJECT_CSS__ */', () => css.trim())
    .replace('/* __INJECT_JS__ */', () => fullJs);

  // Write to root index.html (for zero-config Vercel & direct open)
  const rootIndexPath = path.join(rootDir, 'index.html');
  fs.writeFileSync(rootIndexPath, outputHtml, 'utf8');

  // Also write to dist/ directory
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), outputHtml, 'utf8');

  const manifestPath = path.join(rootDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    fs.copyFileSync(manifestPath, path.join(distDir, 'manifest.json'));
  }

  console.log(
    `✅ Built Citrus Kitten successfully: index.html (${(
      Buffer.byteLength(outputHtml, 'utf8') / 1024
    ).toFixed(1)} KB)`
  );
  return outputHtml;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildProject();
}
