import { describe, expect, it } from 'vitest'
import { safeNext } from './AuthForm'

describe('safeNext (open-redirect guard)', () => {
  it.each(['/dashboard', '/events/abc/budget', '/events/new?occasion=wedding'])('allows the in-app path %s', (path) => {
    expect(safeNext(path)).toBe(path)
  })

  it.each([null, '', 'https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', 'javascript:alert(1)', 'evil.com'])(
    'rejects %j',
    (path) => {
      expect(safeNext(path)).toBe('/dashboard')
    },
  )
})
