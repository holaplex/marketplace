import { useCallback, useEffect } from 'react'
import { useReactiveVar } from '@apollo/client'
import { sidebarOpenVar } from '../../cache'

interface SidebarContext {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useSidebar = (): SidebarContext => {
  const sidebarOpen = useReactiveVar(sidebarOpenVar)

  const toggleSidebar = useCallback(() => {
    const next = !!!sidebarOpen

    if (next) {
      document?.querySelector('body')?.classList.add('overflow-hidden')
    } else {
      document?.querySelector('body')?.classList.remove('overflow-hidden')
    }

    sidebarOpenVar(next)
  }, [sidebarOpen])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const resize = () => {
      if (window.innerWidth > 640) {
        document?.querySelector('body')?.classList.remove('overflow-hidden')
        sidebarOpenVar(false)
      }
    }

    window.addEventListener('resize', resize)
    ;() => window.removeEventListener('resize', resize)
  }, [])

  return { sidebarOpen, toggleSidebar }
}
