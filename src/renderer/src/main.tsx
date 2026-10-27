import { desktopReady } from './desktop'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/authEvents'
import { track } from './lib/analytics'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { RealtimeProvider } from './contexts/RealtimeContext'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { SettingsPageProvider } from './contexts/SettingsPageContext'
import { TabsProvider } from './contexts/TabsContext'
import './assets/main.css'

document
  .getElementById('splash-status-link')
  ?.addEventListener('click', () => window.api.openExternal('https://status.jailbreakchangelogs.com'))
document
  .getElementById('splash-website-link')
  ?.addEventListener('click', () => window.api.openExternal('https://jailbreakchangelogs.com'))

window.addEventListener(
  'keydown',
  (event) => event.key === 'Tab' && document.documentElement.classList.add('keyboard-nav'),
  true
)
window.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-nav'), true)

const reportedErrors = new Set<string>()
const reportError = (kind: string, error: unknown): void => {
  const message = String(error instanceof Error ? error.message : error).slice(0, 300)
  if (reportedErrors.has(message)) return
  reportedErrors.add(message)
  const stack = error instanceof Error && error.stack ? error.stack.slice(0, 1000) : ''
  track('js_error', { kind, message, stack })
}

void desktopReady.then(() => {
  window.addEventListener('error', (event) => reportError('error', event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => reportError('rejection', event.reason))
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <RealtimeProvider>
            <PreferencesProvider>
              <SettingsPageProvider>
                <TabsProvider>
                  <App />
                </TabsProvider>
              </SettingsPageProvider>
            </PreferencesProvider>
          </RealtimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  )
})
