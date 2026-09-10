import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CaregiverDashboard } from '@/screens/CaregiverDashboard'
import { CircleScreen } from '@/screens/CircleScreen'
import { FamilyHomeScreen } from '@/screens/FamilyHomeScreen'
import { HealthWorkerScreen } from '@/screens/HealthWorkerScreen'
import { HealthWorkerSettingsScreen } from '@/screens/HealthWorkerSettingsScreen'
import { HealthWorkerPatientScreen } from '@/screens/HealthWorkerPatientScreen'
import { HealthWorkerSessionScreen } from '@/screens/HealthWorkerSessionScreen'
import { MemoriesScreen } from '@/screens/MemoriesScreen'
import { MemoryComposerScreen } from '@/screens/MemoryComposerScreen'
import { RemindersScreen } from '@/screens/RemindersScreen'
import { SessionScreen } from '@/screens/SessionScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { SignInScreen } from '@/screens/SignInScreen'
import { SignUpScreen } from '@/screens/SignUpScreen'
import { TrendsScreen } from '@/screens/TrendsScreen'
import { useApp } from '@/state/AppContext'

/** Where "home" is depends on who is holding the device. */
function useHomePath(): string {
  const { currentUser } = useApp()
  return currentUser?.layer === 3 ? '/family' : '/'
}

/**
 * Routes are gated by capability, not by hiding links: a family member who types
 * /trends is returned home rather than shown a permission error.
 */
function Allowed({ when, children }: { when: boolean; children: ReactNode }) {
  const home = useHomePath()
  const location = useLocation()
  if (when) return <>{children}</>
  return <Navigate to={home} replace state={{ from: location.pathname }} />
}

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true } as const

export function App() {
  const { currentUser, can } = useApp()

  // Signed out: the welcome screen is the only door. Everything else returns here.
  if (!currentUser) {
    return (
      <BrowserRouter future={routerFuture}>
        <Routes>
          <Route path="/login" element={<SignInScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />
          <Route path="/healthworker" element={<HealthWorkerScreen />} />
          <Route path="/healthworker/settings" element={<HealthWorkerSettingsScreen />} />
          <Route path="/healthworker/:residentId" element={<HealthWorkerPatientScreen />} />
          <Route path="/healthworker/:residentId/session" element={<HealthWorkerSessionScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  const layer = currentUser.layer ?? 1

  return (
    // Opting into the v7 behaviour now keeps the console clear, which matters when the
    // console is where a caregiver-reported problem gets diagnosed.
    <BrowserRouter future={routerFuture}>
      <Routes>
        <Route path="/" element={layer === 3 ? <Navigate to="/family" replace /> : <CaregiverDashboard />} />

        <Route
          path="/session"
          element={
            <Allowed when={can.startSession}>
              <SessionScreen />
            </Allowed>
          }
        />

        <Route
          path="/trends"
          element={
            <Allowed when={can.viewTrends}>
              <TrendsScreen />
            </Allowed>
          }
        />

        <Route
          path="/reminders"
          element={
            <Allowed when={can.viewReminders}>
              <RemindersScreen />
            </Allowed>
          }
        />

        <Route
          path="/memories"
          element={
            <Allowed when={can.viewMemories}>
              <MemoriesScreen />
            </Allowed>
          }
        />

        <Route
          path="/memories/new"
          element={
            <Allowed when={can.createMemory}>
              <MemoryComposerScreen />
            </Allowed>
          }
        />

        <Route
          path="/circle"
          element={
            <Allowed when={can.manageFamily}>
              <CircleScreen />
            </Allowed>
          }
        />

        <Route path="/family" element={layer === 3 ? <FamilyHomeScreen /> : <Navigate to="/" replace />} />

        <Route path="/settings" element={<SettingsScreen />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
