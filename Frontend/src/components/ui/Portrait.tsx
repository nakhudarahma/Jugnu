import { useState } from 'react'
import type { Person } from '@/types'

const tones: Record<Person['portraitTone'], { from: string; to: string; figure: string; ink: string }> = {
  amber: { from: '#FCEBD5', to: '#F0BB79', figure: '#C46F1B', ink: '#7A4A12' },
  sage: { from: '#E4EFEA', to: '#A8CFC1', figure: '#3F7F6E', ink: '#2E5F52' },
  lilac: { from: '#EDE8F5', to: '#BFB2DC', figure: '#7C6BA8', ink: '#5D4E85' },
  clay: { from: '#F9E7DC', to: '#E4B292', figure: '#C4744A', ink: '#9C5733' },
  dusk: { from: '#E8EBEF', to: '#B4BEC9', figure: '#7A8592', ink: '#5A6472' },
}

interface PortraitProps {
  person?: Pick<Person, 'name' | 'portraitTone' | 'photoUrl'>
  name?: string
  tone?: Person['portraitTone']
  photoUrl?: string
  /** Renders initials instead of the silhouette — used in dense caregiver lists. */
  compact?: boolean
  className?: string
  alt?: string
}

/**
 * A person's picture. When a real photo has been added it is used; otherwise a warm
 * generated portrait stands in, so Level 2 never falls back to clip-art.
 */
export function Portrait({ person, name, tone, photoUrl, compact = false, className = '', alt }: PortraitProps) {
  const [failed, setFailed] = useState(false)
  const displayName = person?.name ?? name ?? ''
  const t = tones[person?.portraitTone ?? tone ?? 'amber']
  const rawSrc = person?.photoUrl ?? photoUrl
  const src = rawSrc?.replace(/^\/People\//i, '/people/')

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt ?? displayName}
        className={`h-full w-full object-cover ${className}`}
        draggable={false}
        onError={() => setFailed(true)}
      />
    )
  }

  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  const gradientId = `pg-${t.figure.replace('#', '')}`

  return (
    <svg viewBox="0 0 120 120" className={`h-full w-full ${className}`} role="img" aria-label={alt ?? displayName}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.from} />
          <stop offset="100%" stopColor={t.to} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#${gradientId})`} />
      {compact ? (
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="44"
          fontWeight="600"
          fill={t.ink}
          fontFamily="Iowan Old Style, Georgia, serif"
        >
          {initials || '·'}
        </text>
      ) : (
        <g fill={t.figure} opacity="0.9">
          <circle cx="60" cy="47" r="21" />
          <path d="M18 120c0-23 19-38 42-38s42 15 42 38z" />
        </g>
      )}
    </svg>
  )
}
