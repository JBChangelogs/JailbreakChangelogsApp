import { useEffect, useRef } from 'react'
import { useTheme } from '@renderer/contexts/ThemeContext'

/** The theme's cursor icon, following the mouse when turned on in Display settings. */
export function ThemeCursor(): React.JSX.Element {
  const iconRef = useRef<HTMLSpanElement>(null)
  const { cursorEnabled: enabled } = useTheme()

  useEffect(() => {
    const icon = iconRef.current
    if (!icon) return
    const hide = (): void => {
      icon.style.visibility = 'hidden'
    }
    hide()
    if (!enabled) return

    const move = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') {
        hide()
        return
      }
      icon.style.transform = `translate(${event.clientX + 16}px, ${event.clientY + 18}px)`
      icon.style.visibility = 'visible'
    }
    const leave = (event: PointerEvent): void => {
      if (!event.relatedTarget) hide()
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerout', leave)
    window.addEventListener('blur', hide)
    return () => {
      hide()
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerout', leave)
      window.removeEventListener('blur', hide)
    }
  }, [enabled])

  return (
    <span
      ref={iconRef}
      aria-hidden="true"
      className="theme-cursor-icon pointer-events-none fixed top-0 left-0 z-[2147483647] size-5 bg-contain bg-no-repeat"
      style={{ visibility: 'hidden' }}
    />
  )
}
