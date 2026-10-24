import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { TAB_INFO } from '@renderer/components/NavBar'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import {
  SINGLE_INSTANCE_TABS,
  TAB_TYPES,
  useNavigationMode,
  useTabs,
  type TabType
} from '@renderer/contexts/TabsContext'
import { getTabsNoticeVisible, setTabsNoticeVisible } from '@renderer/lib/localPreferences'
import { cn } from '@renderer/lib/utils'

const CLOSE_ANIMATION_MS = 150

const TAB_SHAPE_INSET = 4

const DRAG_THRESHOLD = 5

const REORDER_ANIMATION: KeyframeAnimationOptions = { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' }


function PlusIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

interface DragLayout {
  listLeft: number
  min: number
  max: number
  naturalLeft: number
  width: number
  centers: { id: string; left: number; center: number }[]
}

export function TabBar(): React.JSX.Element {
  const { tabs, activeTab, activate, open, close, move, meta } = useTabs()
  const [dragOrder, setDragOrder] = useState<string[] | null>(null)
  const orderedTabs = useMemo(() => {
    if (!dragOrder) return tabs
    const byId = new Map(tabs.map((tab) => [tab.id, tab]))
    const ordered = dragOrder.flatMap((id) => byId.get(id) ?? [])
    return ordered.length === tabs.length ? ordered : tabs
  }, [tabs, dragOrder])
  const settings = useSettingsPage()
  const [knownIds] = useState(() => new Set(tabs.map((tab) => tab.id)))
  const [entering, setEntering] = useState<ReadonlySet<string>>(new Set())
  const added = tabs.filter((tab) => !knownIds.has(tab.id))
  if (added.length) {
    added.forEach((tab) => knownIds.add(tab.id))
    setEntering((prev) => new Set([...prev, ...added.map((tab) => tab.id)]))
  }
  const [closing, setClosing] = useState<ReadonlySet<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const closable = tabs.length - closing.size > 1
  const tabRefs = useRef(new Map<string, HTMLDivElement>())
  const indicatorRef = useRef<HTMLDivElement>(null)
  const placedOnce = useRef(false)
  const drag = useRef<{
    id: string
    pointerId: number
    startX: number
    startLeft: number
    x: number
    offset: number
    moving: boolean
    frame: number
    layout: DragLayout | null
  } | null>(null)
  const lastPositions = useRef(new Map<string, number>())
  const [draggingTabs, setDraggingTabs] = useState(false)
  const plusRef = useRef<HTMLButtonElement>(null)
  const [plusShift, setPlusShift] = useState(0)

  const snap = (value: number): number => Math.round(value * devicePixelRatio) / devicePixelRatio

  const placeIndicator = (animate: boolean): void => {
    const indicator = indicatorRef.current
    const el = tabRefs.current.get(activeTab.id)
    const list = el?.parentElement
    if (!indicator || !el || !list || drag.current?.moving) return
    const shift = new DOMMatrix(getComputedStyle(el).transform).m41
    const rect = el.getBoundingClientRect()
    const listLeft = list.getBoundingClientRect().left
    const left = snap(rect.left - shift + TAB_SHAPE_INSET)
    const right = snap(rect.right - shift - TAB_SHAPE_INSET)
    indicator.style.transition = animate && placedOnce.current ? '' : 'none'
    indicator.style.transform = `translateX(${left - listLeft}px)`
    indicator.style.width = `${right - left}px`
    indicator.style.visibility = 'visible'
    placedOnce.current = true
  }
  const placeIndicatorRef = useRef(placeIndicator)
  placeIndicatorRef.current = placeIndicator

  const measureDrag = (): void => {
    const current = drag.current
    const el = current && tabRefs.current.get(current.id)
    const list = el?.parentElement
    const plus = plusRef.current
    if (!current || !el || !list || !plus) return
    const style = getComputedStyle(list)
    current.layout = {
      listLeft: list.getBoundingClientRect().left,
      min: parseFloat(style.paddingLeft),
      max: list.clientWidth - parseFloat(style.paddingRight) - plus.offsetWidth - 4 - el.offsetWidth,
      naturalLeft: el.offsetLeft,
      width: el.offsetWidth,
      centers: orderedTabs.map((tab) => {
        const tabEl = tabRefs.current.get(tab.id)
        return {
          id: tab.id,
          left: tabEl?.offsetLeft ?? 0,
          center: tabEl ? tabEl.offsetLeft + tabEl.offsetWidth / 2 : 0
        }
      })
    }
  }

  const updateDrag = (): void => {
    const current = drag.current
    const layout = current?.layout
    const el = current && tabRefs.current.get(current.id)
    const indicator = indicatorRef.current
    if (!current?.moving || !layout || !el) return
    const left = Math.min(Math.max(current.startLeft + current.x - current.startX, layout.min), layout.max)
    current.offset = left - layout.naturalLeft
    el.style.transform = `translateX(${current.offset}px)`
    if (indicator && current.id === activeTab.id) {
      const shapeLeft = snap(layout.listLeft + left + TAB_SHAPE_INSET)
      const shapeRight = snap(layout.listLeft + left + layout.width - TAB_SHAPE_INSET)
      indicator.style.transform = `translateX(${shapeLeft - layout.listLeft}px)`
      indicator.style.width = `${shapeRight - shapeLeft}px`
    }
    const center = left + layout.width / 2
    const target = layout.centers.filter((tab) => tab.id !== current.id && tab.center < center).length
    if (target === layout.centers.findIndex((tab) => tab.id === current.id)) return
    lastPositions.current = new Map(layout.centers.map((tab) => [tab.id, tab.left]))
    current.layout = null
    const ids = layout.centers.map((tab) => tab.id).filter((tabId) => tabId !== current.id)
    ids.splice(target, 0, current.id)
    setDragOrder(ids)
  }
  const updateDragRef = useRef(updateDrag)
  updateDragRef.current = updateDrag
  const measureDragRef = useRef(measureDrag)
  measureDragRef.current = measureDrag

  useLayoutEffect(() => {
    const previous = lastPositions.current
    tabRefs.current.forEach((el, id) => {
      const before = previous.get(id)
      if (before === undefined || id === drag.current?.id || before === el.offsetLeft) return
      el.animate([{ transform: `translateX(${before - el.offsetLeft}px)` }, { transform: 'none' }], REORDER_ANIMATION)
    })
    lastPositions.current = new Map()
    if (drag.current?.moving) {
      measureDragRef.current()
      updateDragRef.current()
    }
    placeIndicatorRef.current(true)
    const observer = new ResizeObserver(() => placeIndicatorRef.current(true))
    tabRefs.current.forEach((tabEl) => observer.observe(tabEl))
    return () => observer.disconnect()
  }, [activeTab.id, orderedTabs])

  const onDragMove = (e: PointerEvent): void => {
    const current = drag.current
    if (!current || current.pointerId !== e.pointerId) return
    current.x = e.clientX
    if (!current.moving) {
      if (Math.abs(current.x - current.startX) < DRAG_THRESHOLD) return
      current.moving = true
      measureDrag()
      if (indicatorRef.current) indicatorRef.current.style.transition = 'none'
      const plus = plusRef.current
      const layout = current.layout
      if (plus && layout) {
        const el = tabRefs.current.get(current.id)
        const list = el?.parentElement
        const end = list ? list.getBoundingClientRect().right - parseFloat(getComputedStyle(list).paddingRight) : 0
        setPlusShift(Math.max(0, end - plus.getBoundingClientRect().right))
      }
      setDraggingTabs(true)
    }
    if (current.frame) return
    current.frame = requestAnimationFrame(() => {
      current.frame = 0
      if (!current.layout) measureDragRef.current()
      updateDragRef.current()
    })
  }

  const endDrag = (): void => {
    const current = drag.current
    drag.current = null
    if (!current?.moving) return
    cancelAnimationFrame(current.frame)
    if (dragOrder) move(current.id, dragOrder.indexOf(current.id))
    setDragOrder(null)
    setDraggingTabs(false)
    setPlusShift(0)
    const el = tabRefs.current.get(current.id)
    if (!el) return
    el.style.transform = ''
    el.animate([{ transform: `translateX(${current.offset}px)` }, { transform: 'none' }], REORDER_ANIMATION)
    placeIndicator(true)
  }
  const dragHandlers = useRef({ onDragMove, endDrag })
  dragHandlers.current = { onDragMove, endDrag }

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, id: string): void => {
    const list = e.currentTarget.parentElement
    const pointerId = e.pointerId
    drag.current = {
      id,
      pointerId,
      startX: e.clientX,
      startLeft: e.currentTarget.offsetLeft,
      x: e.clientX,
      offset: 0,
      moving: false,
      frame: 0,
      layout: null
    }
    const onMove = (ev: PointerEvent): void => dragHandlers.current.onDragMove(ev)
    const onEnd = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      list?.removeEventListener('lostpointercapture', onEnd)
      dragHandlers.current.endDrag()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    list?.setPointerCapture(pointerId)
    list?.addEventListener('lostpointercapture', onEnd)
  }

  const select = (id: string): void => {
    if (settings.isOpen) settings.close()
    activate(id)
  }

  const startClose = (id: string): void => {
    if (closing.has(id) || !closable) return
    setClosing((prev) => new Set(prev).add(id))
    setTimeout(() => {
      close(id)
      setClosing((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, CLOSE_ANIMATION_MS)
  }

  const pick = (type: TabType): void => {
    if (settings.isOpen) settings.close()
    open(type, { newTab: true })
    setPickerOpen(false)
  }

  return (
    <div role="tablist" aria-label="Tabs" className="relative flex h-full min-w-0 flex-1 items-end pr-10 pl-2">
      <div
        ref={indicatorRef}
        aria-hidden
        style={{ visibility: 'hidden' }}
        className={cn(
          'pointer-events-none absolute bottom-[-1px] left-0 z-[1] h-[32px] rounded-t-lg border border-b-0 border-border-primary bg-primary-bg before:absolute before:bottom-0 before:-left-[8px] before:size-2 before:bg-[radial-gradient(circle_at_0_0,transparent_6.75px,var(--color-border-primary)_7.25px,var(--color-border-primary)_7.75px,var(--color-primary-bg)_8.25px)] after:absolute after:-right-[8px] after:bottom-0 after:size-2 after:bg-[radial-gradient(circle_at_100%_0,transparent_6.75px,var(--color-border-primary)_7.25px,var(--color-border-primary)_7.75px,var(--color-primary-bg)_8.25px)]',
          'transition-[transform,width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none'
        )}
      />
      {orderedTabs.map((tab) => {
        const { Icon, label: typeLabel } = TAB_INFO[tab.type]
        const active = tab.id === activeTab.id
        const { title, badge } = meta[tab.id] ?? {}
        const label = title || typeLabel
        return (
          <Tooltip key={tab.id} delayDuration={500}>
            <TooltipTrigger asChild>
              <div
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el)
                  else tabRefs.current.delete(tab.id)
                }}
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                data-tauri-drag-region="false"
                onPointerDown={(e) => {
                  if (e.button === 1) e.preventDefault()
                  if (e.button !== 0) return
                  select(tab.id)
                  startDrag(e, tab.id)
                }}
                onAuxClick={(e) => e.button === 1 && startClose(tab.id)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  select(tab.id)
                }}
                className={cn(
                  'group relative -mb-px flex h-[32px] min-w-0 flex-[0_1_15rem] border border-b-0 border-transparent text-xs font-medium whitespace-nowrap transition-colors duration-200',
                  active ? 'z-[2] text-primary-text' : 'text-secondary-text hover:text-primary-text',
                  closing.has(tab.id)
                    ? 'animate-tab-out pointer-events-none'
                    : entering.has(tab.id) && 'animate-tab-in'
                )}
                onAnimationEnd={(e) => {
                  if (e.target !== e.currentTarget || e.animationName !== 'tab-in') return
                  setEntering((prev) => {
                    const next = new Set(prev)
                    next.delete(tab.id)
                    return next
                  })
                }}
              >
                {!active && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-[3px] -top-px bottom-[4px] rounded-lg transition-colors group-hover:bg-quaternary-bg/50"
                  />
                )}
                <span className="relative mb-[5px] flex min-w-0 flex-1 items-center gap-2 overflow-hidden pr-[7px] pl-3">
                  <span className="relative flex shrink-0 [&_svg]:h-4 [&_svg]:w-4">
                    <Icon />
                    {!!badge && !active && (
                      <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-card-tag-bg px-0.5 text-[8px] font-semibold text-card-tag-text">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {closable && (
                    <button
                      type="button"
                      aria-label={`Close ${label}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        startClose(tab.id)
                      }}
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-tertiary-text hover:bg-quaternary-bg hover:text-primary-text"
                    >
                      <PlusIcon className="h-4 w-4 rotate-45" />
                    </button>
                  )}
                </span>
              </div>
            </TooltipTrigger>
            {!draggingTabs && <TooltipContent side="bottom">{label}</TooltipContent>}
          </Tooltip>
        )
      })}
      <span
        aria-hidden
        className={cn(
          'h-4 w-px shrink-0 self-center bg-border-primary transition-opacity duration-150 [[role=tab]:hover+&]:opacity-0',
          (orderedTabs[orderedTabs.length - 1]?.id === activeTab.id || draggingTabs) && 'opacity-0'
        )}
      />
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="New tab"
                ref={plusRef}
                style={plusShift ? { transform: `translateX(${plusShift}px)` } : undefined}
                data-tauri-drag-region="false"
                className={cn(
                  'mb-[5px] ml-1 flex h-6 w-6 shrink-0 items-center justify-center self-end rounded-full transition-[color,background-color,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-quaternary-bg hover:text-primary-text motion-reduce:transition-none',
                  pickerOpen ? 'bg-quaternary-bg text-primary-text' : 'text-secondary-text'
                )}
              >
                <PlusIcon className={cn('h-4 w-4 transition-transform duration-200', pickerOpen && 'rotate-45')} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">New tab</TooltipContent>
        </Tooltip>
        <PopoverContent align="start" className="w-60 p-1.5" onCloseAutoFocus={(e) => e.preventDefault()}>
          {TAB_TYPES.map((type) => {
            const { Icon, title } = TAB_INFO[type]
            const alreadyOpen = SINGLE_INSTANCE_TABS.has(type) && tabs.some((tab) => tab.type === type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => pick(type)}
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm text-primary-text transition-colors hover:bg-quaternary-bg"
              >
                <span className="flex shrink-0 text-secondary-text [&_svg]:h-4 [&_svg]:w-4">
                  <Icon />
                </span>
                <span className="min-w-0 flex-1 truncate">{title}</span>
                {alreadyOpen && <span className="text-xs text-tertiary-text">Open</span>}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function TabsNotice(): React.JSX.Element | null {
  const { mode } = useNavigationMode()
  const settings = useSettingsPage()
  const [open, setOpen] = useState(() => mode === 'tabs' && getTabsNoticeVisible())

  const dismiss = (): void => {
    setOpen(false)
    setTabsNoticeVisible(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tabs are here</DialogTitle>
          <DialogDescription>Open pages as tabs in the title bar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4 text-sm text-secondary-text">
          <p>
            Use the + next to your tabs to open messages, trades, trackers, values, calculators and dupe finders. Your
            tabs are saved, so you can pick up where you left off.
          </p>
          <p>Prefer the old sidebar? Switch back to Simple navigation in Display settings anytime.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={dismiss}>
              Got it
            </Button>
            <Button
              type="button"
              onClick={() => {
                dismiss()
                settings.open('display')
              }}
            >
              Open Display settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
