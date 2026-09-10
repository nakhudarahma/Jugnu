import type { SVGProps } from 'react'

export type IconName =
  | 'back'
  | 'chevronRight'
  | 'chevronDown'
  | 'close'
  | 'check'
  | 'plus'
  | 'settings'
  | 'user'
  | 'users'
  | 'mic'
  | 'camera'
  | 'image'
  | 'play'
  | 'pause'
  | 'stop'
  | 'trash'
  | 'pencil'
  | 'bell'
  | 'heart'
  | 'home'
  | 'lock'
  | 'logout'
  | 'sparkle'
  | 'clock'
  | 'calendar'
  | 'shield'
  | 'send'
  | 'volume'

const paths: Record<IconName, string[]> = {
  back: ['M15 5l-7 7 7 7'],
  chevronRight: ['M9 5l7 7-7 7'],
  chevronDown: ['M5 9l7 7 7-7'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  check: ['M5 13l4 4L19 6'],
  plus: ['M12 5v14', 'M5 12h14'],
  settings: [
    'M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z',
    'M12 2.8l1.1 2.1 2.3-.5 1.2 2-1.2 2 1.2 2-1.2 2-2.3-.5L12 21.2l-1.1-2.1-2.3.5-1.2-2 1.2-2-1.2-2 1.2-2 2.3.5z',
  ],
  user: ['M20 21v-1.8a4 4 0 00-4-4H8a4 4 0 00-4 4V21', 'M12 11.2a4.1 4.1 0 100-8.2 4.1 4.1 0 000 8.2z'],
  users: [
    'M16 21v-1.8a4 4 0 00-4-4H6a4 4 0 00-4 4V21',
    'M9 11.2a4.1 4.1 0 100-8.2 4.1 4.1 0 000 8.2z',
    'M22 21v-1.8a4 4 0 00-3-3.8',
    'M16 3.2a4.1 4.1 0 010 7.9',
  ],
  mic: ['M12 2.5a3 3 0 00-3 3V11a3 3 0 006 0V5.5a3 3 0 00-3-3z', 'M18.5 10.5V11a6.5 6.5 0 01-13 0v-.5', 'M12 17.5V21', 'M8.5 21h7'],
  camera: ['M21 19.5a1.8 1.8 0 01-1.8 1.8H4.8A1.8 1.8 0 013 19.5v-10a1.8 1.8 0 011.8-1.8h2.9l1.6-2.5h5.4l1.6 2.5h2.9A1.8 1.8 0 0121 9.5z', 'M12 17.8a3.9 3.9 0 100-7.8 3.9 3.9 0 000 7.8z'],
  image: ['M4 4h16v16H4z', 'M9 10.2a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z', 'M20 14.5l-4.8-4.6L6 20'],
  play: ['M7 4.5l12 7.5-12 7.5z'],
  pause: ['M9 5v14', 'M15 5v14'],
  stop: ['M6.5 6.5h11v11h-11z'],
  trash: ['M3.5 6.5h17', 'M8.5 6.5V4h7v2.5', 'M6 6.5L7 20.5h10l1-14'],
  pencil: ['M12.5 20.5H21', 'M16.7 3.6a2.1 2.1 0 013 3L7.5 18.8l-4.2 1.1 1.1-4.2z'],
  bell: ['M18 8.5a6 6 0 10-12 0c0 6.5-2.6 8.5-2.6 8.5h17.2S18 15 18 8.5', 'M13.8 20.5a2 2 0 01-3.6 0'],
  heart: ['M20.5 6a4.7 4.7 0 00-6.7 0L12 7.8l-1.8-1.8A4.7 4.7 0 003.5 12.7L12 21l8.5-8.3A4.7 4.7 0 0020.5 6z'],
  home: ['M3.5 10.5L12 3.8l8.5 6.7v9a1.8 1.8 0 01-1.8 1.8H5.3a1.8 1.8 0 01-1.8-1.8z', 'M9.3 21.3v-8h5.4v8'],
  lock: ['M5.5 11.2h13v10h-13z', 'M8.5 11.2V7.5a3.5 3.5 0 017 0v3.7'],
  logout: ['M9.5 21H5.3a1.8 1.8 0 01-1.8-1.8V4.8A1.8 1.8 0 015.3 3h4.2', 'M16 16.5l4.5-4.5L16 7.5', 'M20.5 12H9.5'],
  sparkle: ['M12 3.2l1.9 5.4 5.4 1.9-5.4 1.9L12 17.8l-1.9-5.4-5.4-1.9 5.4-1.9z'],
  clock: ['M12 21a9 9 0 100-18 9 9 0 000 18z', 'M12 7.5V12l3 1.8'],
  calendar: ['M4.5 5.5h15v15h-15z', 'M4.5 10.2h15', 'M9 3v4', 'M15 3v4'],
  shield: ['M12 21.5s7.8-3.7 7.8-9.6V5.2L12 2.5 4.2 5.2v6.7c0 5.9 7.8 9.6 7.8 9.6z'],
  send: ['M21 3L10.5 13.5', 'M21 3l-6.6 18-3.9-7.5L3 9.6z'],
  volume: ['M4 9.3h3.6L12.4 5.3v13.4L7.6 14.7H4z', 'M16.2 9.2a4.3 4.3 0 010 5.6', 'M19 6.6a8 8 0 010 10.8'],
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
