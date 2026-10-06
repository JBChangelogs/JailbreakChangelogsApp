import { useAuth } from '@renderer/contexts/AuthContext'
import { Button } from '@renderer/components/ui/button'
import appIcon from '@renderer/assets/icon.png'

function ShieldCheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-3.752 8.394-8.35 9.868a1.24 1.24 0 01-.6 0C7.752 20.394 4 16.556 4 12V6.373c0-.487.312-.917.776-1.066a11.955 11.955 0 007.014-3.19 1.238 1.238 0 011.42 0 11.955 11.955 0 007.014 3.19c.464.15.776.579.776 1.066V12z"
      />
    </svg>
  )
}

function LegalLink({ href, children }: { href: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => window.api.openExternal(href)}
      className="text-link hover:text-link-hover cursor-pointer underline"
    >
      {children}
    </button>
  )
}

export function LoginGate(): React.JSX.Element {
  const { status, error, login, cancelLogin } = useAuth()

  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img src={appIcon} alt="" className="h-16 w-16 rounded-full" draggable={false} />
          <h1 className="mt-4 text-xl font-bold text-primary-text">
            Sign in to Jailbreak Changelogs
          </h1>
          <p className="mt-2 text-sm text-secondary-text">
            Connect with Discord to build your user profile. We only collect your publicly
            available Discord details.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-secondary-text">
          <ShieldCheckIcon className="text-link h-4 w-4 shrink-0" />
          <span>We never see or store your password.</span>
        </div>

        <div className="mt-6 space-y-4 text-center">
          <p className="text-xs text-primary-text">
            By continuing, you agree to our{' '}
            <LegalLink href="https://jailbreakchangelogs.com/tos">Terms of Service</LegalLink> and{' '}
            <LegalLink href="https://jailbreakchangelogs.com/privacy">Privacy Policy</LegalLink>.
          </p>

          {status === 'waiting' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 rounded-lg border border-border-primary bg-form-input px-3 py-2.5 text-sm text-secondary-text">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-status-info" />
                Waiting for you to finish in your browser…
              </div>
              <Button variant="ghost" size="sm" onClick={cancelLogin}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="default" size="lg" className="w-full" onClick={login}>
              Continue with Discord
            </Button>
          )}

          {status === 'error' && error && <p className="text-sm text-form-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
