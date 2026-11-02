/**
 * Only same-app paths are allowed as a post-login destination (no open redirects). Browsers
 * treat a backslash like a slash and strip tabs/newlines, so those tricks are rejected too.
 */
export const safeNext = (next: string | null) => (next && /^\/(?![\\/])[^\\\t\n\r]*$/.test(next) ? next : '/dashboard')
