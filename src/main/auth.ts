import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

function tokenPath(): string {
  return join(app.getPath('userData'), 'auth-token.enc')
}

export function saveToken(token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn(
      '[auth] OS-level encryption is unavailable on this system; the session will not persist across restarts.'
    )
    return
  }
  writeFileSync(tokenPath(), safeStorage.encryptString(token))
}

export function loadToken(): string | null {
  const file = tokenPath()
  if (!existsSync(file) || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(readFileSync(file))
  } catch {
    return null
  }
}

export function clearToken(): void {
  const file = tokenPath()
  if (existsSync(file)) unlinkSync(file)
}
