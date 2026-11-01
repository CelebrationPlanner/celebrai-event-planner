import { useEffect, useState } from 'react'

type ApiStatus = 'checking' | 'ok' | 'unreachable'

export default function App() {
  const [status, setStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/health`)
      .then((res) => setStatus(res.ok ? 'ok' : 'unreachable'))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main>
      <h1>CelebrAI</h1>
      <p role="status">API: {status}</p>
    </main>
  )
}
