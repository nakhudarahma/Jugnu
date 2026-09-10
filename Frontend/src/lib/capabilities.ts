import type { AppUser, LayerId } from '@/types'

/**
 * Frontend-only demo build: every seeded user gets the full experience so nothing
 * in a demo is locked behind a layer it wasn't meant for. Flip this to false to
 * resume role-based restrictions when the backend arrives.
 */
export const DEMO_MODE = true

/**
 * Layer 2 is the same Jugnu, with fewer keys. Restricted actions are hidden or
 * visibly disabled up front — never surfaced as an error after a click.
 */
export interface Capabilities {
  viewDashboard: boolean
  startSession: boolean
  viewTrends: boolean
  viewChangeSignal: boolean
  moodCheckIn: boolean
  viewMemories: boolean
  createMemory: boolean
  editAnyMemory: boolean
  approveContributions: boolean
  viewReminders: boolean
  manageAllReminders: boolean
  manageAssignedReminders: boolean
  manageFamily: boolean
  inviteFamily: boolean
  editPatientProfile: boolean
  editPatientIdentity: boolean
  editPersonalization: boolean
  editSecurity: boolean
  contributeOnly: boolean
}

const NONE: Capabilities = {
  viewDashboard: false,
  startSession: false,
  viewTrends: false,
  viewChangeSignal: false,
  moodCheckIn: false,
  viewMemories: false,
  createMemory: false,
  editAnyMemory: false,
  approveContributions: false,
  viewReminders: false,
  manageAllReminders: false,
  manageAssignedReminders: false,
  manageFamily: false,
  inviteFamily: false,
  editPatientProfile: false,
  editPatientIdentity: false,
  editPersonalization: false,
  editSecurity: false,
  contributeOnly: false,
}

const FULL: Capabilities = {
  viewDashboard: true,
  startSession: true,
  viewTrends: true,
  viewChangeSignal: true,
  moodCheckIn: true,
  viewMemories: true,
  createMemory: true,
  editAnyMemory: true,
  approveContributions: true,
  viewReminders: true,
  manageAllReminders: true,
  manageAssignedReminders: true,
  manageFamily: true,
  inviteFamily: true,
  editPatientProfile: true,
  editPatientIdentity: true,
  editPersonalization: true,
  editSecurity: true,
  contributeOnly: false,
}

export function capabilitiesFor(user: AppUser | null | undefined): Capabilities {
  if (!user) return NONE
  const layer: LayerId = user.layer

  if (DEMO_MODE) {
    // The demo unlocks everything except family management, invites, the patient's
    // identity fields (name, age, region) and PINs, which all stay with the primary
    // caregiver. A helper may still change what the family calls the patient.
    return {
      ...FULL,
      manageFamily: layer === 1,
      inviteFamily: layer === 1,
      editPatientIdentity: layer === 1,
      editSecurity: layer === 1,
    }
  }

  if (layer === 1) {
    return {
      ...NONE,
      viewDashboard: true,
      startSession: true,
      viewTrends: true,
      viewChangeSignal: true,
      moodCheckIn: true,
      viewMemories: true,
      createMemory: true,
      editAnyMemory: true,
      approveContributions: true,
      viewReminders: true,
      manageAllReminders: true,
      manageAssignedReminders: true,
      manageFamily: true,
      inviteFamily: true,
      editPatientProfile: true,
      editPatientIdentity: true,
      editPersonalization: true,
      editSecurity: true,
    }
  }

  if (layer === 2) {
    return {
      ...NONE,
      viewDashboard: true,
      startSession: true,
      viewTrends: user.canSeeTrends !== false,
      viewChangeSignal: false,
      moodCheckIn: true,
      viewMemories: true,
      createMemory: true,
      editAnyMemory: false,
      viewReminders: true,
      manageAssignedReminders: true,
      manageFamily: false,
    }
  }

  if (layer === 3) {
    return { ...NONE, viewMemories: true, createMemory: true, contributeOnly: true }
  }

  return NONE
}

export const layerLabel: Record<LayerId, string> = {
  0: 'Patient',
  1: 'Primary caregiver',
  2: 'Trusted helper',
  3: 'Family member',
}
