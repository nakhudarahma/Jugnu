import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AppUser } from '@/types'
import { BrandMark } from '@/components/caregiver/CaregiverHeader'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { ApiError, setTokens } from '@/lib/api'
import { triggerGoogleSignIn } from '@/lib/googleAuth'
import { useApp } from '@/state/AppContext'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.65v3h3.86c2.26-2.09 3.56-5.17 3.56-8.9z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 5.27 9.7V6.61H1.29a11.99 11.99 0 0 0 0 10.78l3.98-3.1z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.61l3.98 3.1c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  )
}

/** Very subtle concentric rings behind the left-panel content */
function SubtleRings() {
  return (
    <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {[460, 310, 170].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full border border-ink/[0.06]"
          style={{ width: size, height: size, opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  )
}

export function SignUpScreen() {
  const { state, dispatch, backendAvailable, api } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [googleId, setGoogleId] = useState('')
  const [googleAccessToken, setGoogleAccessToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [pickingMode, setPickingMode] = useState(false)

  const googleSignUp = () => {
    if (connecting) return
    setConnecting(true)
    setError('')
    triggerGoogleSignIn(
      ({ profile, accessToken }) => {
        const normalizedEmail = (profile.email || '').toLowerCase()
        const haveProfile = () => {
          setName(profile.name || 'Caregiver')
          setEmail(normalizedEmail || profile.email || '')
          setGoogleId(profile.sub || '')
          setGoogleAccessToken(accessToken)
          setPickingMode(true)
        }
        const signInExisting = (userId: string, layer: number) => {
          dispatch({ type: 'signIn', userId })
          navigate(layer === 2 ? '/healthworker' : '/')
        }

        // Server-verified: does this account already exist?
        if (backendAvailable) {
          api.googleLogin(accessToken, { createIfMissing: false })
            .then((res) => {
              setTokens(res.accessToken, res.refreshToken)
              const isWorker = res.user.role === 'HEALTH_WORKER'
              dispatch({
                type: 'signIn',
                userId: res.user.id,
                user: {
                  name: res.user.name,
                  relationship: isWorker ? 'Health Worker' : 'Primary Caregiver',
                  layer: isWorker ? 2 : 1,
                  googleId: profile.sub,
                  googleEmail: profile.email?.toLowerCase(),
                  canSeeTrends: true,
                },
              })
              navigate(isWorker ? '/healthworker' : '/')
            })
            .catch((err: unknown) => {
              if (err instanceof ApiError && err.status === 404) {
                // No account yet — capture their details and ask which mode to create.
                haveProfile()
              } else {
                setError("Couldn't reach Jugnu to create your account. Please try again.")
              }
            })
            .finally(() => setConnecting(false))
          return
        }

        // Offline / demo fallback: recognise or create accounts stored locally.
        setConnecting(false)
        const existingUser =
          (profile.sub ? state.users.find((u) => u.googleId === profile.sub) : undefined) ||
          state.users.find((u) => u.googleEmail?.toLowerCase() === normalizedEmail)
        if (existingUser) {
          signInExisting(existingUser.id, existingUser.layer)
          return
        }
        haveProfile()
      },
      (reason) => {
        setConnecting(false)
        if (reason === 'cancelled') return
        setError("Couldn't reach Google. Please try again.")
      },
    )
  }

  const registerWithMode = (role: 'FAMILY_CAREGIVER' | 'HEALTH_WORKER') => {
    setPickingMode(false)
    setConnecting(true)
    setError('')

    // Server-verified account creation. Dispatching sets currentUser, which
    // switches App.tsx to the signed-in router; /signup then redirects to /
    // which re-routes by role (health worker → /healthworker).
    if (backendAvailable && googleAccessToken) {
      api.googleLogin(googleAccessToken, { role, createIfMissing: true })
        .then((res) => {
          setTokens(res.accessToken, res.refreshToken)
          const isWorker = res.user.role === 'HEALTH_WORKER'
          dispatch({
            type: 'createNewSpace',
            userId: res.user.id,
            user: {
              name: res.user.name,
              relationship: isWorker ? 'Health Worker' : 'Primary Caregiver',
              layer: isWorker ? 2 : 1,
              googleId,
              googleEmail: email.trim() || undefined,
              canSeeTrends: true,
            },
          })
          navigate(isWorker ? '/healthworker' : '/')
        })
        .catch(() => {
          setError("Couldn't create your Jugnu account. Please try again.")
        })
        .finally(() => setConnecting(false))
      return
    }

    const userId = `u_${Date.now()}`
    const isWorker = role === 'HEALTH_WORKER'
    const displayName = name.trim() || 'Caregiver'
    const newUser: Partial<AppUser> = {
      name: displayName,
      relationship: isWorker ? 'Health Worker' : 'Primary Caregiver',
      layer: isWorker ? 2 : 1,
      googleId: googleId.trim() || undefined,
      googleEmail: email.trim() || undefined,
    }
    dispatch({ type: 'createNewSpace', userId, user: newUser })
    setConnecting(false)
  }

  const enterFamilyMode = () => registerWithMode('FAMILY_CAREGIVER')
  const enterWorkerMode = () => registerWithMode('HEALTH_WORKER')

  return (
    <div className="flex min-h-[100dvh] bg-cream">

      {/* ─── Left panel ─── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[48%] relative overflow-hidden bg-sand/35 items-center justify-center">
        <SubtleRings />

        {/* Content sits slightly above centre */}
        <div
          className="relative z-10 flex flex-col items-center text-center px-16 xl:px-24 animate-rise-in"
          style={{ marginBottom: '6%' }}
        >
          <BrandMark size={76} />

          <p className="mt-3.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-ink-faint/70">
            Jugnu
          </p>

          <h2 className="mt-11 font-display text-[2.1rem] xl:text-[2.45rem] text-ink leading-[1.2] tracking-tight">
            Every memory<br />matters.
          </h2>

          <p className="mt-5 text-[0.875rem] leading-[1.95] text-ink-soft/90 max-w-[250px]">
            Gentle activities inspired by<br />
            the people, places and routines<br />
            that feel like home.
          </p>

          <div className="mt-9 flex items-center gap-3.5">
            {['Memory', 'Routine', 'Connection'].map((word, i, arr) => (
              <span key={word} className="flex items-center gap-3.5">
                <span className="text-[9px] tracking-[0.2em] uppercase text-ink-faint/80">{word}</span>
                {i < arr.length - 1 && (
                  <span className="h-[3px] w-[3px] rounded-full bg-ink-faint/30" />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right panel ─── */}
      <div className="flex-1 flex items-center justify-center px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-[330px] animate-rise-in" style={{ animationDelay: '60ms' }}>

          {/* Mobile-only header */}
          <header className="flex flex-col items-center text-center lg:hidden mb-10">
            <BrandMark size={58} />
            <h1 className="mt-5 font-display text-[1.6rem] text-ink leading-snug">
              Every memory<br />matters.
            </h1>
          </header>

          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-ink-faint/80 mb-3">
              Create an account
            </p>
            <h1 className="font-display text-[1.75rem] text-ink leading-tight">
              Create my space
            </h1>
            <p className="mt-2 text-[0.82rem] text-ink-soft/90 leading-relaxed">
              A warm home for memory, routine and connection.
            </p>
          </div>

          {/* Google SSO */}
          <button
            type="button"
            onClick={googleSignUp}
            disabled={connecting}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-paper px-5 py-3 text-[0.82rem] font-semibold text-ink shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:shadow-md active:scale-[0.99] disabled:opacity-55"
          >
            <GoogleMark />
            {connecting ? 'Creating your account…' : 'Continue with Google'}
          </button>

          {error && (
            <p className="mt-2 text-center text-[0.8rem] text-[#b3352e]" role="alert">
              {error}
            </p>
          )}

          <p className="mt-7 text-center text-[0.8rem] text-ink-soft/90">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-glow-700 underline-offset-4 transition hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <Modal
        open={pickingMode}
        onClose={() => setPickingMode(false)}
        title="Welcome! Which Jugnu is this account for?"
        description="Your new account is ready. Choose the mode you'll use it in."
        size="sm"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={enterFamilyMode}
            className="flex w-full items-start gap-3 rounded-2xl border border-line bg-paper px-4 py-3.5 text-left transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-ink-soft">
              <Icon name="users" size={17} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Family caregiver mode</span>
              <span className="mt-0.5 block text-xs text-ink-soft/90">The caregiver dashboard, routine and family-led care.</span>
            </span>
          </button>

          <button
            type="button"
            onClick={enterWorkerMode}
            className="flex w-full items-start gap-3 rounded-2xl border border-line bg-paper px-4 py-3.5 text-left transition duration-200 ease-calm hover:border-glow-300 hover:bg-glow-50"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-ink-soft">
              <Icon name="shield" size={17} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Health worker mode</span>
              <span className="mt-0.5 block text-xs text-ink-soft/90">Facility roster — who needs checking on today.</span>
            </span>
          </button>
        </div>
      </Modal>
    </div>
  )
}