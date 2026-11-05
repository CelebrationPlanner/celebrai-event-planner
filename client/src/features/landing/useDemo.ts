import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { startDemo } from '@/app/session'
import { errorMessage } from '@/lib/api'

/** Starts an isolated demo account with a sample event, then opens the dashboard. */
export function useDemo() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  async function run() {
    setPending(true)
    try {
      await startDemo()
      navigate('/dashboard')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }
  return { run, pending }
}
