import type { AppUser, PatientProfile } from '@/types'

/** What a given user calls the patient. Falls back to the shared display name. */
export function patientLabel(patient: PatientProfile, user?: AppUser | null): string {
  return user?.callsPatient?.trim() || patient.displayName
}