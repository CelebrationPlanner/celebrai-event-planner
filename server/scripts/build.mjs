// Bundles the server (including the TypeScript-only @celebrai/shared workspace) into dist/.
// Real npm dependencies stay external and are installed on the host as usual.
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

const { dependencies } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: Object.keys(dependencies).filter((name) => name !== '@celebrai/shared'),
})
