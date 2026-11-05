// Runs after `vite build` and the SSR build of src/prerender.tsx. Puts the landing page's HTML into
// dist/index.html (served at /) and keeps the empty shell as dist/app.html for the app's routes
// (netlify.toml), so app screens never show the landing page before React loads.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'

const { render } = await import('../dist-ssr/prerender.js')
const shell = readFileSync('dist/index.html', 'utf8')
const root = '<div id="root"></div>'
if (shell.split(root).length !== 2) throw new Error('Expected exactly one empty #root in dist/index.html')

const html = render()
if (!html.includes('Every Celebration Starts With a Plan')) throw new Error('Pre-rendered landing page looks wrong')

writeFileSync('dist/app.html', shell)
writeFileSync('dist/index.html', shell.replace(root, `<div id="root">${html}</div>`))
rmSync('dist-ssr', { recursive: true, force: true })
console.log(`pre-rendered landing page: ${Math.round(html.length / 1024)} KB of HTML`)
// The Supabase auth client imported by the landing page can keep timers alive in Node.
process.exit(0)
