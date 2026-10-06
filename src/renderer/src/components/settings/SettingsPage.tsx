import { useEffect, useState } from 'react'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { SettingsSidebar } from './SettingsSidebar'
import { AccountSettingsSection } from './sections/AccountSettingsSection'
import { PrivacySettingsSection } from './sections/PrivacySettingsSection'
import { NotificationsSettingsSection } from './sections/NotificationsSettingsSection'
import { RichPresenceSettingsSection } from './sections/RichPresenceSettingsSection'
import { GiftInventorySection } from './sections/GiftInventorySection'
import { WhatsNewSection } from './sections/WhatsNewSection'

const EXIT_ANIMATION_MS = 200

export function SettingsPage(): React.JSX.Element | null {
  const { isOpen, section, close } = useSettingsPage()
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    const timeout = setTimeout(() => setMounted(false), EXIT_ANIMATION_MS)
    return () => clearTimeout(timeout)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  if (!mounted) return null

  return (
    <div
      className={`absolute inset-0 z-[1200] flex bg-primary-bg transition-all duration-200 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <SettingsSidebar />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {section === 'account' && <AccountSettingsSection />}
        {section === 'privacy' && <PrivacySettingsSection />}
        {section === 'notifications' && <NotificationsSettingsSection />}
        {section === 'richPresence' && <RichPresenceSettingsSection />}
        {section === 'gifts' && <GiftInventorySection />}
        {section === 'whatsNew' && <WhatsNewSection />}
      </div>
    </div>
  )
}
