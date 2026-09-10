import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/caregiver/CaregiverHeader'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
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

export function SignInScreen() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [pickingDemo, setPickingDemo] = useState(false)

  const primary = state.users.find((u) => u.layer === 1)

  const googleSignIn = () => {
    if (!primary || connecting) return
    setConnecting(true)
    window.setTimeout(() => dispatch({ type: 'signIn', userId: primary.id }), 700)
  }

  const emailSignIn = () => {
    if (!primary || connecting) return
    setConnecting(true)
    window.setTimeout(() => dispatch({ type: 'signIn', userId: primary.id }), 700)
  }

  const enterFamilyDemo = () => {
    if (!primary || connecting) return
    setPickingDemo(false)
    setConnecting(true)
    window.setTimeout(() => dispatch({ type: 'signIn', userId: primary.id }), 500)
  }

  const enterWorkerDemo = () => {
    setPickingDemo(false)
    navigate('/healthworker')
  }

  const canSubmit = email.trim().includes('@') && password.length > 0

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
            Welcome back to<br />what matters.
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
              Welcome back to<br />what matters.
            </h1>
          </header>

          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-ink-faint/80 mb-3">
              Sign in
            </p>
            <h1 className="font-display text-[1.75rem] text-ink leading-tight">
              Good to have you back.
            </h1>
            <p className="mt-2 text-[0.82rem] text-ink-soft/90 leading-relaxed">
              Your household routine and care circle are waiting.
            </p>
          </div>

          {/* Google SSO */}
          <button
            type="button"
            onClick={googleSignIn}
            disabled={connecting}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-paper px-5 py-3 text-[0.82rem] font-semibold text-ink shadow-card transition duration-200 ease-calm hover:border-glow-300 hover:shadow-md active:scale-[0.99] disabled:opacity-55"
          >
            <GoogleMark />
            {connecting ? 'Connecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Email form */}
          <form
            className="space-y-3.5"
            onSubmit={(e) => { e.preventDefault(); emailSignIn() }}
          >
            <Field label="Email" required>
              {(id) => (
                <TextInput
                  id={id}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                />
              )}
            </Field>
            <Field label="Password" required>
              {(id) => (
                <TextInput
                  id={id}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              )}
            </Field>

            <div className="pt-1">
              <Button
                variant="primary"
                block
                type="submit"
                disabled={!canSubmit || connecting}
                className="py-3 text-[0.85rem]"
              >
                {connecting ? 'Signing in…' : 'Sign in'}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-ink-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            onClick={() => setPickingDemo(true)}
            disabled={connecting}
            className="flex w-full items-center justify-center gap-2 rounded-pill border border-[#df862f] bg-[#df862f] px-5 py-2.5 text-[0.85rem] font-medium text-white shadow-sm transition duration-200 ease-calm hover:bg-[#cd7624] hover:border-[#cd7624] active:scale-[0.99] disabled:opacity-55"
          >
            <Icon name="sparkle" size={15} className="shrink-0 text-white" />
            <span>Try demo account</span>
          </button>

          <p className="mt-7 text-center text-[0.8rem] text-ink-soft/90">
            New to Jugnu?{' '}
            <Link to="/signup" className="font-semibold text-glow-700 underline-offset-4 transition hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <Modal
        open={pickingDemo}
        onClose={() => setPickingDemo(false)}
        title="Try the demo"
        description="Which Jugnu would you like to open?"
        size="sm"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={enterFamilyDemo}
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
            onClick={enterWorkerDemo}
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