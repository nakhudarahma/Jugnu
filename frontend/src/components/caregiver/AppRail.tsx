import { Link, useLocation } from 'react-router-dom'
import { Icon, type IconName } from '@/components/ui/Icon'
import { layerLabel } from '@/lib/capabilities'
import { useApp } from '@/state/AppContext'

function isHealthWorker(user: { layer?: number; relationship?: string } | null | undefined): boolean {
  return user?.relationship === 'Health Worker' || (user?.layer === 2 && user?.relationship !== 'Trusted helper' && user?.relationship !== 'Day helper')
}

interface RailItem {
  to: string
  icon: IconName
  label: string
}

/** Persistent teal navigation rail — the ocean depth that carries every caregiver screen. */
export function AppRail() {
  const { currentUser, can } = useApp()
  const { pathname } = useLocation()

  const worker = isHealthWorker(currentUser)
  const home = currentUser?.layer === 3 ? '/family' : worker ? '/healthworker' : '/'

  // Family mode gets its destinations straight on the rail.
  const familyItems: RailItem[] = worker
    ? []
    : [
        ...(can.viewTrends ? [{ to: '/trends', icon: 'sparkle', label: 'Trends' } satisfies RailItem] : []),
        ...(can.viewReminders ? [{ to: '/reminders', icon: 'bell', label: 'Reminders' } satisfies RailItem] : []),
        ...(can.viewMemories ? [{ to: '/memories', icon: 'heart', label: 'Memories' } satisfies RailItem] : []),
        ...(can.manageFamily ? [{ to: '/circle', icon: 'users', label: 'Family circle' } satisfies RailItem] : []),
      ]

  if (!currentUser) return null

  const settingsItem: RailItem = { to: worker ? '/healthworker/settings' : '/settings', icon: 'settings', label: 'Settings' }

  const railLink = (item: RailItem) => {
    const active = pathname === item.to
    return (
      <Link
        key={item.label}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        title={item.label}
        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition duration-200 ease-calm lg:px-4 ${
          active
            ? 'bg-white/90 text-[#0B6B5F] shadow-[0_6px_20px_-8px_rgba(11,107,95,0.45)]'
            : 'text-[#2F7E72] hover:bg-white/60 hover:text-[#0A5B51]'
        }`}
      >
        <Icon name={item.icon} size={20} className={`shrink-0 ${active ? 'text-[#E1A500]' : ''}`} />
        <span className="hidden lg:inline">{item.label}</span>
      </Link>
    )
  }

  const items: RailItem[] = [
    { to: home, icon: 'home', label: 'Home' } satisfies RailItem,
    ...(worker ? [{ to: '/healthworker/patients', icon: 'users', label: 'Patients' } satisfies RailItem] : familyItems),
    settingsItem,
  ]

  // Mobile: keep it to a fixed bottom bar so every screen gets the full width.
  const mobileLink = (item: RailItem) => {
    const active = pathname === item.to
    return (
      <Link
        key={item.label}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 py-1 transition duration-200 ease-calm ${
          active ? 'text-[#0B6B5F]' : 'text-[#2F7E72] hover:text-[#0A5B51]'
        }`}
      >
        <div className="flex h-6 w-full items-center justify-center">
          <Icon name={item.icon} size={20} className={`shrink-0 ${active ? 'text-[#E1A500]' : ''}`} />
        </div>
        <div className="flex h-6 w-full items-center justify-center">
          <span className="max-w-full text-center text-[10px] font-semibold leading-[1.1]">{item.label}</span>
        </div>
      </Link>
    )
  }

  return (
    <>
      {/* Phone rail: fixed tab bar along the bottom */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center rounded-t-3xl border-t border-[#B5D9CF]/80 bg-gradient-to-b from-[#C5E7DD] to-[#A5D7CA] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {items.map((item) => mobileLink(item))}
      </nav>

      {/* Desktop rail: exactly as before on laptop */}
      <nav
        aria-label="Primary"
        className="sticky top-0 z-30 hidden h-[100dvh] w-[80px] shrink-0 flex-col items-center gap-1 border-r border-[#B5D9CF] bg-gradient-to-b from-[#C5E7DD] to-[#A5D7CA] px-2 py-5 lg:flex lg:w-60 lg:items-stretch"
      >
      {/* Brand */}
      <div className="flex items-center justify-center gap-2 lg:justify-start lg:px-2">
        <img src="/logoo.png" alt="Jugnu" className="h-8 w-8 object-contain" />
        <span className="hidden font-display text-lg tracking-wide text-[#0B6B5F] lg:inline">Jugnu</span>
      </div>

      {/* Navigation */}
      <div className="mt-7 flex flex-col gap-1.5 lg:mt-8">
        {railLink({ to: home, icon: 'home', label: 'Home' })}

        {worker && railLink({ to: '/healthworker/patients', icon: 'users', label: 'Patients' })}

        {!worker && familyItems.map((item) => railLink(item))}

        {railLink(settingsItem)}
      </div>

      {/* Who is holding the device */}
      <div className="mt-auto hidden lg:block">
        <div className="rounded-2xl bg-white/60 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-[#0B6B5F]">{currentUser.name}</p>
          <p className="mt-0.5 text-[11px] text-[#3D8478]">{layerLabel[currentUser.layer ?? 1]}</p>
        </div>
      </div>
      </nav>
    </>
  )
}