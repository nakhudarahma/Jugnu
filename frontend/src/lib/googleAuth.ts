declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: unknown) => { requestAccessToken: () => void }
        }
        id?: any
      }
    }
  }
}

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '450102728922-9grspilpf58c41dsuk162bh9edu7die5.apps.googleusercontent.com'

export type GoogleAuthFailure = 'unavailable' | 'cancelled' | 'failed' | 'network'

export interface GoogleProfile {
  sub: string
  name: string
  email: string
  email_verified?: boolean
  picture?: string
  given_name?: string
  family_name?: string
  locale?: string
}

export interface GoogleAuthResult {
  profile: GoogleProfile
  /** Raw OAuth access token, sent server-side for verification via `/auth/google`. */
  accessToken: string
}

/**
 * Opens the real Google account chooser in a popup and delivers the selected
 * account's profile (name, email, picture) alongside the raw access token so the
 * caller can verify it server-side.
 *
 * Uses the Google Identity Services OAuth 2.0 implicit flow with
 * `prompt: 'select_account'`, which guarantees the account chooser appears
 * instead of a silent one-tap prompt. Must be called from a user gesture so
 * popups are not blocked.
 */
export function triggerGoogleSignIn(
  onSuccess: (result: GoogleAuthResult) => void,
  onError?: (reason: GoogleAuthFailure) => void,
): void {
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    onError?.('unavailable')
    return
  }

  let settled = false
  const settle = (fn: () => void) => {
    if (settled) return
    settled = true
    fn()
  }

  try {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (response: { access_token?: string }) => {
        if (!response?.access_token) {
          settle(() => onError?.('cancelled'))
          return
        }
        const accessToken = response.access_token
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => {
            if (!res.ok) throw new Error('userinfo request failed')
            return res.json()
          })
          .then((profile: GoogleProfile) => settle(() => onSuccess({ profile, accessToken })))
          .catch(() => settle(() => onError?.('network')))
      },
      error_callback: (error: { error?: string; error_description?: string }) => {
        console.error('[Jugnu] Google OAuth error_callback:', error)
        settle(() => {
          if (error?.error === 'popup_closed_by_user' || error?.error === 'user_cancelled_authorize') {
            onError?.('cancelled')
          } else {
            onError?.('failed')
          }
        })
      },
    })
    client.requestAccessToken()
  } catch {
    settle(() => onError?.('unavailable'))
  }
}