/**
 * Inline icon set.
 *
 * Hand-rolled rather than pulled from a library — the product needs about
 * fifteen glyphs, and a dependency for that would be more weight than it's
 * worth. All icons share a 24-unit grid and 1.75 stroke so they sit together.
 */

interface IconProps {
  className?: string;
  size?: number;
}

function svg(path: React.ReactNode, extra?: { fill?: boolean }) {
  return function Icon({ className = "", size = 16 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={extra?.fill ? "currentColor" : "none"}
        stroke={extra?.fill ? "none" : "currentColor"}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {path}
      </svg>
    );
  };
}

export const IconSparkle = svg(
  <>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
  </>,
);

export const IconCheck = svg(<path d="M20 6L9 17l-5-5" />);

export const IconCheckCircle = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </>,
);

export const IconAlert = svg(
  <>
    <path d="M12 3.5l9 16H3l9-16z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </>,
);

export const IconConflict = svg(
  <>
    <path d="M7 4v6a4 4 0 004 4h6" />
    <path d="M17 4v6a4 4 0 01-4 4H7" />
    <path d="M12 17v3" />
  </>,
);

export const IconLock = svg(
  <>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7a4 4 0 118 0v3.5" />
  </>,
);

export const IconPencil = svg(
  <>
    <path d="M16.5 4.5l3 3L8 19l-4 1 1-4L16.5 4.5z" />
  </>,
);

export const IconSigma = svg(
  <>
    <path d="M18 5H7l6 7-6 7h11" />
  </>,
);

export const IconDoc = svg(
  <>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
    <path d="M14 3v5h5" />
  </>,
);

export const IconSearch = svg(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </>,
);

export const IconChevronRight = svg(<path d="M9 5l7 7-7 7" />);
export const IconChevronDown = svg(<path d="M5 9l7 7 7-7" />);
export const IconChevronLeft = svg(<path d="M15 5l-7 7 7 7" />);
export const IconArrowRight = svg(<path d="M4 12h16M14 6l6 6-6 6" />);

export const IconClock = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.5l3.5 2" />
  </>,
);

export const IconUser = svg(
  <>
    <circle cx="12" cy="8.5" r="3.75" />
    <path d="M4.5 20a7.5 7.5 0 0115 0" />
  </>,
);

export const IconGrid = svg(
  <>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </>,
);

export const IconLayers = svg(
  <>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </>,
);

export const IconX = svg(<path d="M6 6l12 12M18 6L6 18" />);

export const IconFilter = svg(<path d="M3.5 5.5h17l-6.5 8v5l-4 2v-7l-6.5-8z" />);

export const IconExternal = svg(
  <>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 14v5a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 19V7.5A1.5 1.5 0 015 6h5" />
  </>,
);

export const IconUndo = svg(
  <>
    <path d="M4 9h11a5 5 0 010 10h-6" />
    <path d="M4 9l4-4M4 9l4 4" />
  </>,
);

export const IconTarget = svg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.5" />
  </>,
);

export const IconSun = svg(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);

export const IconMoon = svg(<path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z" />);

export const IconInbox = svg(
  <>
    <path d="M3.5 13h4l1.5 3h6l1.5-3h4" />
    <path d="M5.5 5h13l2 8v5a1.5 1.5 0 01-1.5 1.5h-14A1.5 1.5 0 013.5 18v-5l2-8z" />
  </>,
);
