import { useOutletContext } from 'react-router'
import type { CelebrationEvent } from '@/types'

/** The event loaded by EventLayout for its tab pages. */
export const useEvent = () => useOutletContext<CelebrationEvent>()
