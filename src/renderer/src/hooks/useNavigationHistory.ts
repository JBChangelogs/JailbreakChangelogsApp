import { useEffect, useRef } from 'react'

// Mouse buttons 4 and 5 (back/forward) report as button 3 and 4.
const MOUSE_BACK = 3
const MOUSE_FORWARD = 4

/**
 * Keeps where the user is in the window's history, so the mouse back/forward buttons step
 * through it like a browser. `state` must be JSON-serializable: each change to it is a new
 * history entry, and going back hands an earlier one to `restore`.
 */
export function useNavigationHistory<T>(state: T, restore: (state: T) => void): void {
  const restoreRef = useRef(restore)
  restoreRef.current = restore
  const serialized = JSON.stringify(state)

  useEffect(() => {
    // Skips the change a back/forward step just made, and the first render (replaced, not pushed).
    if (JSON.stringify(window.history.state) === serialized) return
    if (window.history.state === null) window.history.replaceState(JSON.parse(serialized), '')
    else window.history.pushState(JSON.parse(serialized), '')
  }, [serialized])

  useEffect(() => {
    const handlePopState = (e: PopStateEvent): void => {
      if (e.state !== null) restoreRef.current(e.state as T)
    }
    const handleMouseUp = (e: MouseEvent): void => {
      if (e.button === MOUSE_BACK) {
        e.preventDefault()
        window.history.back()
      } else if (e.button === MOUSE_FORWARD) {
        e.preventDefault()
        window.history.forward()
      }
    }
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])
}
