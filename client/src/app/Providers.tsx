import { LazyMotion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { DemoStoreProvider } from '@/demo/DemoStore'
import type { DemoState } from '@/demo/demoData'

const loadMotionFeatures = () => import('./motionFeatures').then((m) => m.default)

export function Providers({ children, initialState }: { children: ReactNode; initialState?: DemoState }) {
  return (
    <DemoStoreProvider initialState={initialState}>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={loadMotionFeatures} strict>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </LazyMotion>
      </MotionConfig>
    </DemoStoreProvider>
  )
}
