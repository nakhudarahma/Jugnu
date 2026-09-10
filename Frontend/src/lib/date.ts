/** All dates in Jugnu are plain "YYYY-MM-DD" strings so mock data stays readable. */

export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return isoDate()
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

/** The seven dates of the current calendar week, Sunday first. */
export function weekDates(): string[] {
  const today = new Date()
  const dow = today.getDay() // 0 = Sunday
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return isoDate(d)
  })
}

export function longDate(iso: string = today()): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function relativeDayLabel(iso: string): string {
  if (iso === today()) return 'Today'
  if (iso === daysAgo(1)) return 'Yesterday'
  return shortDate(iso)
}
