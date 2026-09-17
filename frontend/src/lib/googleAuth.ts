declare global {
  interface Window {
    google?: any
  }
}

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '346769116770-8sbq3hjq50ubsjkp5vt3apf0l6mejhbj.apps.googleusercontent.com'

export function triggerGoogleSignIn(onSuccess: (credential: string) => void, onError?: () => void) {
  if (typeof window === 'undefined') {
    onError?.()
    return
  }

  if (window.google?.accounts?.id) {
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => {
          if (response?.credential) {
            onSuccess(response.credential)
          } else {
            onError?.()
          }
        },
      })
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          onError?.()
        }
      })
    } catch {
      onError?.()
    }
  } else {
    onError?.()
  }
}
