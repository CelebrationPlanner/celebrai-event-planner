import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

// jsdom lacks these browser APIs used by Recharts, Motion and Radix.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) as MediaQueryList
Element.prototype.scrollIntoView ??= function () {}
Element.prototype.scrollTo ??= function () {}
Element.prototype.setPointerCapture ??= function () {}
Element.prototype.releasePointerCapture ??= function () {}
Element.prototype.hasPointerCapture ??= () => false

// Lazy routes import their chunk on first render; give findBy* queries room for that.
configure({ asyncUtilTimeout: 5000 })

// Component tests run against an in-memory backend instead of the network (see fakeBackend.ts).
vi.mock('@/lib/supabase', async () => ({ supabase: (await import('./fakeBackend')).fakeSupabase }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: (await import('./fakeBackend')).fakeApi,
}))
