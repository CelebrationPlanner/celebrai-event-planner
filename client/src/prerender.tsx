// Build-time render of the landing page (see scripts/prerender.mjs), so crawlers that do not run
// JavaScript still see its content. The browser renders the app from scratch as usual.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import LandingPage from '@/features/landing/LandingPage'

export function render() {
  return renderToString(
    <StaticRouter location="/">
      <LandingPage />
    </StaticRouter>,
  )
}
