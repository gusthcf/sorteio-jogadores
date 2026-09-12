/**
 * Icones desenhados a mao (SVG inline) — sem dependencia externa,
 * traco consistente de 1.75 e cantos arredondados.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ children, className = 'h-5 w-5', ...rest }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base} {...rest}>
      {children}
    </svg>
  )
}

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="M13.5 6.5 17.5 10.5" />
  </Svg>
)

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M10 4h4M9 7v12M15 7v12M6 7l1 13h10l1-13" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)

export const IconX = (p) => (
  <Svg {...p}>
    <path d="M6 6 18 18M18 6 6 18" />
  </Svg>
)

export const IconRoster = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" />
    <path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 14.8c1.8.6 3 2.2 3.4 4.7" />
  </Svg>
)

export const IconShuffle = (p) => (
  <Svg {...p}>
    <path d="M3 7h3.2c1.3 0 2.4.7 3 1.8l3.6 6.4c.6 1.1 1.7 1.8 3 1.8H20" />
    <path d="M3 17h3.2c1.3 0 2.4-.7 3-1.8l.9-1.6M14.2 9.4l.6-1.1c.6-1.1 1.7-1.8 3-1.8H20" />
    <path d="m17.5 3.8 2.6 2.7-2.6 2.7M17.5 14.3l2.6 2.7-2.6 2.7" />
  </Svg>
)

export const IconTrophy = (p) => (
  <Svg {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
    <path d="M12 14v3.5M8.5 20.5h7M9.5 20.5c0-1.7 1.1-3 2.5-3s2.5 1.3 2.5 3" />
  </Svg>
)

export const IconHistory = (p) => (
  <Svg {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.2 4.5v4.2h4.2" />
    <path d="M12 7.8V12l2.8 1.8" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.2" />
    <path d="m15.6 15.6 4 4" />
  </Svg>
)

export const IconMinus = (p) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)

export const IconChevron = (p) => (
  <Svg {...p}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
)

export const IconBall = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5c-3.4 4.6-3.4 12.4 0 17" />
    <path d="M4.3 9.2c4.7 2.6 12.3 2.4 15.4-1.4" />
    <path d="M4.6 16.3c4.2-3.1 10.4-4.2 14.2-1.8" />
  </Svg>
)

export const IconShare = (p) => (
  <Svg {...p}>
    <path d="M12 15.5V4m0 0L8.4 7.6M12 4l3.6 3.6" />
    <path d="M5 13v5.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V13" />
  </Svg>
)

export const IconEye = (p) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
)

export const IconUndo = (p) => (
  <Svg {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
)

export const IconCourt = (p) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M12 3.5v17" />
    <path d="M12 8.5h0M12 12h0M12 15.5h0" strokeWidth="3" />
  </Svg>
)

export const IconChart = (p) => (
  <Svg {...p}>
    <path d="M5 20v-8M12 20V5M19 20v-5" />
  </Svg>
)

export const IconAlert = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v4.5M12 16h.01" />
  </Svg>
)
