import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { LazyMotion, MotionConfig } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { createQueryClient } from '@/lib/queries'
import { AuthProvider } from './auth'

const loadMotionFeatures = () => import('./motionFeatures').then((m) => m.default)

export function Providers({ children, queryClient }: { children: ReactNode; queryClient?: QueryClient }) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <LazyMotion features={loadMotionFeatures} strict>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </LazyMotion>
        </MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  )
}
