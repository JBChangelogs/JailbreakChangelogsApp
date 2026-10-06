import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/authEvents'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { RealtimeProvider } from './contexts/RealtimeContext'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { SettingsPageProvider } from './contexts/SettingsPageContext'
import './assets/main.css'

document
  .getElementById('splash-status-link')
  ?.addEventListener('click', () => window.api.openExternal('https://status.jailbreakchangelogs.com'))
document
  .getElementById('splash-website-link')
  ?.addEventListener('click', () => window.api.openExternal('https://jailbreakchangelogs.com'))

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RealtimeProvider>
          <PreferencesProvider>
            <SettingsPageProvider>
              <App />
            </SettingsPageProvider>
          </PreferencesProvider>
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
