import { useState } from 'react'

interface ArtProps {
  name: string
  className?: string
  /** Force the hand-drawn SVG even when a real image exists (decorative spots). */
  drawn?: boolean
}

const S = { stroke: '#6B4F35', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const warm = '#F7D5A9'
const deep = '#E1892E'
const leaf = '#8FBFA9'

/** Candidate image files tried in order when a real image is supplied in public/art/. */
const imageExts = ['png', 'webp', 'jpg', 'jpeg'] as const

/**
 * Puzzles render from real images when a matching file exists at /art/<name>.png
 * (also tries .webp, .jpg, .jpeg). When no file is supplied, the drawn high-contrast
 * illustration below is used instead — so dropping files into public/art/ upgrades the
 * look with no other code changes.
 */
export function Illustration({ name, className, drawn }: ArtProps) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set())

  const candidates = drawn
    ? []
    : imageExts
        .map((ext) => `/art/${name}.${ext}`)
        .concat(imageExts.map((ext) => `/art/fallback.${ext}`))
  const src = candidates.find((candidate) => !failed.has(candidate))

  if (!src) {
    return (
      <svg viewBox="0 0 112 112" className={className} role="img" aria-hidden="true" focusable="false">
        {art(name)}
      </svg>
    )
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={className}
      style={{ objectFit: 'contain', objectPosition: 'center' }}
      onError={() => setFailed((prev) => new Set(prev).add(src))}
    />
  )
}

function art(name: string) {
  switch (name) {
    case 'cup':
      return (
        <g {...S} fill="none">
          <path d="M26 42h50v26a20 20 0 0 1-20 20H46a20 20 0 0 1-20-20z" fill={warm} />
          <path d="M76 50h6a11 11 0 0 1 0 22h-6" />
          <ellipse cx="51" cy="94" rx="32" ry="6" fill={warm} />
          <path d="M44 30c0-5 6-6 6-11M58 32c0-5 6-6 6-11" />
        </g>
      )
    case 'flower':
      return (
        <g {...S}>
          <g fill={warm}>
            <circle cx="56" cy="26" r="14" />
            <circle cx="80" cy="43" r="14" />
            <circle cx="71" cy="70" r="14" />
            <circle cx="41" cy="70" r="14" />
            <circle cx="32" cy="43" r="14" />
          </g>
          <circle cx="56" cy="48" r="13" fill={deep} />
          <path d="M56 62v42" fill="none" />
          <path d="M56 84c10 0 16-6 18-14-10-2-16 4-18 14z" fill={leaf} />
        </g>
      )
    case 'sun':
      return (
        <g {...S}>
          <circle cx="56" cy="56" r="24" fill={deep} />
          <g fill="none">
            <path d="M56 12v12M56 88v12M12 56h12M88 56h12M25 25l8 8M79 79l8 8M87 25l-8 8M33 79l-8 8" />
          </g>
        </g>
      )
    case 'key':
      return (
        <g {...S}>
          <circle cx="36" cy="42" r="18" fill={warm} />
          <circle cx="36" cy="42" r="6" fill="#FFFFFF" />
          <path d="M48 54l32 32" fill="none" />
          <path d="M66 72l10 10M58 64l10 10" fill="none" />
        </g>
      )
    case 'clock':
      return (
        <g {...S}>
          <circle cx="56" cy="56" r="38" fill={warm} />
          <circle cx="56" cy="56" r="3" fill="#6B4F35" />
          <path d="M56 34v22l16 10" fill="none" />
        </g>
      )
    case 'glasses':
      return (
        <g {...S} fill="none">
          <circle cx="32" cy="60" r="18" fill={warm} />
          <circle cx="80" cy="60" r="18" fill={warm} />
          <path d="M50 58c4-4 8-4 12 0M14 52l-6-8M98 52l6-8" />
        </g>
      )
    case 'umbrella':
      return (
        <g {...S}>
          <path d="M10 58a46 46 0 0 1 92 0z" fill={deep} />
          <path d="M56 58v34a10 10 0 0 1-20 0" fill="none" />
          <path d="M10 58c10-10 20-10 30 0 8-10 24-10 32 0 8-10 20-10 30 0" fill="none" />
        </g>
      )
    case 'kettle':
      return (
        <g {...S}>
          <path d="M28 48h44a12 12 0 0 1 12 12v14a18 18 0 0 1-18 18H34a18 18 0 0 1-18-18V60a12 12 0 0 1 12-12z" fill={warm} />
          <path d="M84 62l16-10-4 22" fill="none" />
          <path d="M34 48c4-10 34-10 38 0" fill="none" />
          <path d="M50 30h12" fill="none" />
        </g>
      )
    case 'brush':
      return (
        <g {...S}>
          <rect x="24" y="60" width="64" height="14" rx="7" fill={warm} />
          <path d="M30 60V44M40 60V40M50 60V42M60 60V40" fill="none" />
          <rect x="24" y="60" width="42" height="14" rx="7" fill="#FFFFFF" opacity="0.5" />
        </g>
      )
    case 'medicine':
      return (
        <g {...S}>
          <rect x="14" y="46" width="52" height="26" rx="13" fill={warm} transform="rotate(-12 40 59)" />
          <circle cx="82" cy="70" r="16" fill={deep} />
          <path d="M74 70h16M82 62v16" fill="none" />
        </g>
      )
    case 'plate':
      return (
        <g {...S}>
          <circle cx="56" cy="58" r="38" fill={warm} />
          <circle cx="56" cy="58" r="22" fill="#FFFFFF" />
          <path d="M46 58h20" fill="none" />
        </g>
      )
    case 'basket':
      return (
        <g {...S}>
          {/* Handle */}
          <path d="M34 52c0-20 44-20 44 0" fill="none" />
          {/* Basket body */}
          <path d="M22 52h68l-8 36a10 10 0 0 1-10 8H40a10 10 0 0 1-10-8z" fill={warm} />
          {/* Weave pattern */}
          <path d="M30 66h52M34 80h44" fill="none" />
          <path d="M44 52l-4 44M56 52v44M68 52l4 44" fill="none" />
        </g>
      )
    case 'mango':
      return (
        <g {...S}>
          {/* Stem & Leaf */}
          <path d="M56 22v12" fill="none" />
          <path d="M56 26c8-8 20-4 22 2-8 8-18 4-22-2z" fill={leaf} />
          {/* Mango fruit */}
          <path
            d="M56 34c18 0 32 14 32 32 0 20-14 34-32 34-22 0-30-18-30-36 0-18 12-30 30-30z"
            fill={deep}
          />
          {/* Soft shine */}
          <path d="M68 46c6 6 6 16 0 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} opacity={0.6} />
        </g>
      )
    case 'leaves':
      return (
        <g {...S}>
          <path d="M56 86V38" fill="none" />
          <path d="M56 46c14-14 30-6 32 6-12 10-26 4-32-6z" fill={leaf} />
          <path d="M56 64c-14-14-30-6-32 6 12 10 26 4 32-6z" fill={leaf} />
          <path d="M56 38c0-12 14-18 18-12-2 14-12 16-18 12z" fill={leaf} />
        </g>
      )
    case 'milk':
      return (
        <g {...S}>
          {/* Pitcher body */}
          <path d="M38 34h36l8 48a12 12 0 0 1-12 14H42a12 12 0 0 1-12-14z" fill={warm} />
          {/* Spout and rim */}
          <path d="M34 34h44" fill="none" />
          <path d="M30 34l-8-6 12-2" fill={warm} />
          {/* Handle */}
          <path d="M78 44c12 4 12 24 0 28" fill="none" />
          {/* Milk accent */}
          <ellipse cx="56" cy="80" rx="14" ry="6" fill="#FFFFFF" opacity={0.6} />
        </g>
      )
    default:
      return (
        <g {...S}>
          <circle cx="56" cy="56" r="34" fill={warm} />
        </g>
      )
  }
}