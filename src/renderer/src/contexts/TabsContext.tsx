import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react'
import { track } from '@renderer/lib/analytics'
import {
  getNavigationMode,
  setNavigationMode,
  type NavigationMode
} from '@renderer/lib/localPreferences'

export type TabType = 'messages' | 'trades' | 'tracker' | 'values' | 'calculator' | 'dupefinder' | 'tradehistory'

export const TAB_TYPES: readonly TabType[] = [
  'messages',
  'trades',
  'tracker',
  'values',
  'calculator',
  'dupefinder',
  'tradehistory'
]

export const SINGLE_INSTANCE_TABS: ReadonlySet<TabType> = new Set(['messages', 'trades', 'tracker'])

export interface Tab {
  id: string
  type: TabType
}

export interface TabMeta {
  title?: string
  badge?: number
}

interface TabsState {
  tabs: Tab[]
  activeId: string
}

interface TabsStateValue {
  tabs: Tab[]
  activeTab: Tab
  meta: Record<string, TabMeta>
}

interface TabActionsValue {
  activate: (id: string) => void
  open: (type: TabType, options?: { newTab?: boolean }) => void
  close: (id: string) => void
  move: (id: string, toIndex: number) => void
  setMeta: (id: string, meta: TabMeta) => void
}

interface NavigationModeValue {
  mode: NavigationMode
  setMode: (mode: NavigationMode) => void
}

const STORAGE_KEY = 'jbcl:tabs'
const TAB_STATE_PREFIX = 'jbcl:tab:'

const createTab = (type: TabType): Tab => ({ id: crypto.randomUUID(), type })

function isTab(value: unknown): value is Tab {
  const tab = value as Partial<Tab> | null
  return typeof tab?.id === 'string' && TAB_TYPES.includes(tab.type as TabType)
}

function load(): TabsState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { tabs?: unknown; activeId?: unknown } | null
    const seen = new Set<TabType>()
    const tabs = (Array.isArray(parsed?.tabs) ? parsed.tabs : []).filter(isTab).filter((tab) => {
      if (SINGLE_INSTANCE_TABS.has(tab.type) && seen.has(tab.type)) return false
      seen.add(tab.type)
      return true
    })
    if (tabs.length) {
      const activeId = tabs.find((tab) => tab.id === parsed?.activeId)?.id ?? tabs[0].id
      return { tabs, activeId }
    }
  } catch {
  }
  const first = createTab('messages')
  return { tabs: [first], activeId: first.id }
}

function clearTabState(id: string): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(`${TAB_STATE_PREFIX}${id}:`)) localStorage.removeItem(key)
    }
  } catch {
  }
}

const TabsStateContext = createContext<TabsStateValue | null>(null)
const TabActionsContext = createContext<TabActionsValue | null>(null)
const NavigationModeContext = createContext<NavigationModeValue | null>(null)

export function TabsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState(load)
  const [meta, setMetaState] = useState<Record<string, TabMeta>>({})
  const [mode, setModeState] = useState<NavigationMode>(getNavigationMode)
  const activeTab = state.tabs.find((tab) => tab.id === state.activeId) ?? state.tabs[0]

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
    }
  }, [state])

  const prevType = useRef(activeTab.type)
  useEffect(() => {
    if (prevType.current !== activeTab.type) track('tab_view', { tab: activeTab.type, prev_tab: prevType.current })
    prevType.current = activeTab.type
  }, [activeTab.type])

  const setMode = useCallback((next: NavigationMode) => {
    setModeState(next)
    setNavigationMode(next)
  }, [])

  const activate = useCallback((id: string) => {
    setState((s) => (s.activeId !== id && s.tabs.some((tab) => tab.id === id) ? { ...s, activeId: id } : s))
  }, [])

  const open = useCallback((type: TabType, options?: { newTab?: boolean }) => {
    setState((s) => {
      const existing = (!options?.newTab || SINGLE_INSTANCE_TABS.has(type)) && s.tabs.find((tab) => tab.type === type)
      if (existing) return { ...s, activeId: existing.id }
      const tab = createTab(type)
      return { tabs: [...s.tabs, tab], activeId: tab.id }
    })
  }, [])

  const close = useCallback((id: string) => {
    setState((s) => {
      const index = s.tabs.findIndex((tab) => tab.id === id)
      if (index === -1 || s.tabs.length <= 1) return s
      const tabs = s.tabs.filter((tab) => tab.id !== id)
      return { tabs, activeId: s.activeId === id ? tabs[Math.min(index, tabs.length - 1)].id : s.activeId }
    })
    setMetaState(({ [id]: _, ...rest }) => rest)
    clearTabState(id)
  }, [])

  const move = useCallback((id: string, toIndex: number) => {
    setState((s) => {
      const from = s.tabs.findIndex((tab) => tab.id === id)
      if (from === -1 || from === toIndex || toIndex < 0 || toIndex >= s.tabs.length) return s
      const tabs = [...s.tabs]
      tabs.splice(toIndex, 0, ...tabs.splice(from, 1))
      return { ...s, tabs }
    })
  }, [])

  const setMeta = useCallback((id: string, patch: TabMeta) => {
    setMetaState((prev) => {
      const current = prev[id] ?? {}
      const changed = (Object.keys(patch) as (keyof TabMeta)[]).some((key) => current[key] !== patch[key])
      return changed ? { ...prev, [id]: { ...current, ...patch } } : prev
    })
  }, [])

  const stateValue = useMemo(() => ({ tabs: state.tabs, activeTab, meta }), [state.tabs, activeTab, meta])
  const actions = useMemo(() => ({ activate, open, close, move, setMeta }), [activate, open, close, move, setMeta])
  const modeValue = useMemo(() => ({ mode, setMode }), [mode, setMode])

  return (
    <TabActionsContext.Provider value={actions}>
      <NavigationModeContext.Provider value={modeValue}>
        <TabsStateContext.Provider value={stateValue}>{children}</TabsStateContext.Provider>
      </NavigationModeContext.Provider>
    </TabActionsContext.Provider>
  )
}

function useRequired<T>(context: React.Context<T | null>): T {
  const ctx = useContext(context)
  if (!ctx) throw new Error('Tab hooks must be used within a TabsProvider')
  return ctx
}

export function useTabs(): TabsStateValue & TabActionsValue {
  return { ...useRequired(TabsStateContext), ...useRequired(TabActionsContext) }
}

export function useTabActions(): TabActionsValue {
  return useRequired(TabActionsContext)
}

export function useNavigationMode(): NavigationModeValue {
  return useRequired(NavigationModeContext)
}

const TabIdContext = createContext('global')

export function TabScope({ id, children }: { id: string; children: React.ReactNode }): React.JSX.Element {
  return <TabIdContext.Provider value={id}>{children}</TabIdContext.Provider>
}

export function useTabState<T>(name: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const key = `${TAB_STATE_PREFIX}${useContext(TabIdContext)}:${name}`
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) return JSON.parse(raw) as T
    } catch {
    }
    return initial
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
    }
  }, [key, value])
  return [value, setValue]
}

export function useTabSet<T extends string>(name: string): [Set<T>, (value: T) => void, () => void] {
  const [values, setValues] = useTabState<T[]>(name, [])
  const set = useMemo(() => new Set(values), [values])
  const toggle = useCallback(
    (value: T) => setValues((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value])),
    [setValues]
  )
  const clear = useCallback(() => setValues([]), [setValues])
  return [set, toggle, clear]
}

export function useTabTitle(title: string | undefined): void {
  const id = useContext(TabIdContext)
  const { setMeta } = useTabActions()
  useEffect(() => setMeta(id, { title }), [id, title, setMeta])
}
