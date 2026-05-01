// Gera versão bookmarklet (javascript:...) a partir do bundle minificado.
import * as esbuild from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

const result = await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  loader: { '.css': 'text' },
  minify: true,
  write: false,
});

const code = result.outputFiles[0].text;
const url = 'javascript:' + encodeURIComponent(code);
writeFileSync('dist/bookmarklet.txt', url, 'utf8');
console.log('[bookmarklet] dist/bookmarklet.txt — cole no campo URL de um favorito');
console.log(`[bookmarklet] ${(url.length / 1024).toFixed(1)} KB`);
