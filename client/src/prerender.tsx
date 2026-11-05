// Build-time render of the public pages (see scripts/prerender.mjs), so crawlers that do not run
// JavaScript still see their content. The browser renders the app from scratch as usual.
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import LandingPage from '@/features/landing/LandingPage'
import OccasionPage from '@/features/occasions/OccasionPage'
import { OCCASION_PAGES } from '@/features/occasions/pages'

const html = (path: string, page: ReactNode) => renderToString(<StaticRouter location={path}>{page}</StaticRouter>)

/** Each page's output file, its HTML, and the head tags that differ from index.html (none for /). */
export function render() {
  return [
    { file: 'index.html', html: html('/', <LandingPage />), head: null },
    ...OCCASION_PAGES.map((p) => ({
      file: `${p.slug}.html`,
      html: html(`/${p.slug}`, <OccasionPage page={p} />),
      head: { path: `/${p.slug}`, title: p.title, description: p.description },
    })),
  ]
}
