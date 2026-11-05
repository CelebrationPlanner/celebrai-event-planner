// Runs after `vite build` and the SSR build of src/prerender.tsx. Writes each public page's HTML
// into a copy of the built shell (index.html for /, <slug>.html for the occasion guides) and keeps
// the empty shell as dist/app.html for the app's routes (netlify.toml), so app screens never show
// a public page before React loads.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'

const SITE = 'https://celebrai-planner.netlify.app'
const { render } = await import('../dist-ssr/prerender.js')
const shell = readFileSync('dist/index.html', 'utf8')
const root = '<div id="root"></div>'
if (shell.split(root).length !== 2) throw new Error('Expected exactly one empty #root in dist/index.html')

const attr = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

/** Swaps the page-specific head tags; each must exist exactly once in the shell. */
function withHead(html, { path, title, description }) {
  const swaps = [
    [/(<title>)[^<]*/, title],
    [/(<meta\s+name="description"\s+content=")[^"]*/, description],
    [/(<link\s+rel="canonical"\s+href=")[^"]*/, SITE + path],
    [/(<meta\s+property="og:url"\s+content=")[^"]*/, SITE + path],
    [/(<meta\s+property="og:title"\s+content=")[^"]*/, title],
    [/(<meta\s+property="og:description"\s+content=")[^"]*/, description],
  ]
  for (const [pattern, value] of swaps) {
    if (html.match(new RegExp(pattern, 'g'))?.length !== 1) throw new Error(`Head tag not found once: ${pattern}`)
    html = html.replace(pattern, (_, prefix) => prefix + attr(value))
  }
  return html
}

for (const page of render()) {
  if (!page.html.includes('<h1')) throw new Error(`Pre-rendered ${page.file} has no <h1>`)
  const doc = shell.replace(root, `<div id="root">${page.html}</div>`)
  writeFileSync(`dist/${page.file}`, page.head ? withHead(doc, page.head) : doc)
  console.log(`pre-rendered ${page.file}: ${Math.round(page.html.length / 1024)} KB of HTML`)
}
writeFileSync('dist/app.html', shell)
rmSync('dist-ssr', { recursive: true, force: true })
// The Supabase auth client imported by the landing page can keep timers alive in Node.
process.exit(0)
