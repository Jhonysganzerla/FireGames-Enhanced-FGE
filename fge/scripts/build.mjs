import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });

/** @type {import('esbuild').BuildOptions} */
const opts = {
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  outfile: 'dist/fge.user.js',
  loader: { '.css': 'text' },
  logLevel: 'info',
  banner: {
    js: '// FireGames Enhanced — build: ' + new Date().toISOString(),
  },
  // O bookmarklet final precisa ser um IIFE que se auto-executa.
  // Não minifiquei pra facilitar debug; mude pra true se quiser menor.
  minify: true,
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log('[build] watching…');
} else {
  await esbuild.build(opts);
  console.log('[build] dist/fge.user.js criado');
}
