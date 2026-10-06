import { createContext, useCallback, useContext, useState } from 'react'
import {
  getSettingsPageOpen,
  setSettingsPageOpen,
  getSettingsPageSection,
  setSettingsPageSection
} from '@renderer/lib/localPreferences'

export type SettingsSectionId = 'account' | 'privacy' | 'notifications' | 'richPresence' | 'gifts' | 'whatsNew'

const VALID_SECTIONS: readonly string[] = [
  'account',
  'privacy',
  'notifications',
  'richPresence',
  'gifts',
  'whatsNew'
] satisfies SettingsSectionId[]

function isSettingsSection(value: string | null): value is SettingsSectionId {
  return value !== null && VALID_SECTIONS.includes(value)
}

interface SettingsPageContextValue {
  isOpen: boolean
  section: SettingsSectionId
  open: (section?: SettingsSectionId) => void
  close: () => void
  setSection: (section: SettingsSectionId) => void
}

const SettingsPageContext = createContext<SettingsPageContextValue | null>(null)

export function SettingsPageProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isOpen, setIsOpenState] = useState(getSettingsPageOpen)
  const [section, setSectionState] = useState<SettingsSectionId>(() => {
    const stored = getSettingsPageSection()
    return isSettingsSection(stored) ? stored : 'account'
  })

  const setSection = useCallback((next: SettingsSectionId) => {
    setSectionState(next)
    setSettingsPageSection(next)
  }, [])

  const open = useCallback(
    (nextSection?: SettingsSectionId) => {
      if (nextSection) setSection(nextSection)
      setIsOpenState(true)
      setSettingsPageOpen(true)
    },
    [setSection]
  )

  const close = useCallback(() => {
    setIsOpenState(false)
    setSettingsPageOpen(false)
  }, [])

  return (
    <SettingsPageContext.Provider value={{ isOpen, section, open, close, setSection }}>
      {children}
    </SettingsPageContext.Provider>
  )
}

export function useSettingsPage(): SettingsPageContextValue {
  const ctx = useContext(SettingsPageContext)
  if (!ctx) throw new Error('useSettingsPage must be used within a SettingsPageProvider')
  return ctx
}
