/* Inline SVG icons copied from design/project/Main.dc.html. */

type P = { size?: number };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function PlusIcon({ size = 16, width = 2 }: P & { width?: number }) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={width} strokeLinejoin={undefined}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MatrixIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.8}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function DoneIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </svg>
  );
}

export function PeopleIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.8}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.7 2.5 3 5.2" />
    </svg>
  );
}

export function FolderIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.8}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.4l2 2.2h8.6A1.5 1.5 0 0 1 21 9.7v8.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z" />
    </svg>
  );
}

export function TickIcon({ size = 14, width = 2.4, className }: P & { width?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} {...base} strokeWidth={width}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function LogoutIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.8}>
      <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={2} strokeLinejoin={undefined}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function OfflineIcon() {
  return (
    <svg width={16} height={16} {...base} strokeWidth={1.8}>
      <path d="M3 3l18 18" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.4-1.7M2 9.3a15 15 0 0 1 4.3-2.7M22 9.3A15 15 0 0 0 11 5.1" />
      <path d="M12 20h.01" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg width={16} height={16} {...base} strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  );
}

export function DescIcon() {
  return (
    <svg width={13} height={13} {...base} strokeWidth={2} strokeLinejoin={undefined}>
      <path d="M5 7h14M5 12h14M5 17h9" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg width={13} height={13} {...base} strokeWidth={1.9}>
      <path d="M9 3h6l-1 6 4 4H6l4-4-1-6Z" />
      <path d="M12 13v8" />
    </svg>
  );
}

export function EditIcon({ size = 14, className }: P & { className?: string }) {
  return (
    <svg className={className} width={size} height={size} {...base} strokeWidth={1.8}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}
