// @ts-check
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: 'node',
  outfile: 'dist/extension.js',
  // vscode is provided by the extension host at runtime
  external: ['vscode'],
  logLevel: 'info',
  // gray-matter is a runtime dependency - bundle it
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log(production ? 'Production build complete.' : 'Development build complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
