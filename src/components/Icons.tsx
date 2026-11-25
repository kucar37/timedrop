import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function BrandMark(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect width="24" height="24" rx="4" fill="currentColor" />
      <rect x="4.5" y="10" width="2.2" height="7.5" rx="0.6" fill="var(--mark-bg)" />
      <rect x="8.2" y="6" width="2.2" height="11.5" rx="0.6" fill="var(--accent)" />
      <rect x="11.9" y="8.5" width="2.2" height="9" rx="0.6" fill="var(--mark-bg)" />
      <rect x="15.6" y="11.2" width="3.9" height="2" rx="0.6" fill="var(--accent)" />
      <rect x="15.6" y="14.7" width="3.9" height="2.8" rx="0.6" fill="var(--mark-bg)" opacity="0.4" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4 2.75a.75.75 0 0 1 1.14-.64l8.5 5.25a.75.75 0 0 1 0 1.28l-8.5 5.25A.75.75 0 0 1 4 13.25V2.75Z" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="3.25" y="2.5" width="3.25" height="11" rx="0.75" />
      <rect x="9.5" y="2.5" width="3.25" height="11" rx="0.75" />
    </svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="10" height="10" rx="1.25" />
    </svg>
  );
}

export function PrevIcon(props: IconProps) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="2.5" y="3" width="1.75" height="10" rx="0.5" />
      <path d="M13 3.4a.6.6 0 0 0-.92-.5L5.2 7.5a.6.6 0 0 0 0 1l6.88 4.6a.6.6 0 0 0 .92-.5V3.4Z" />
    </svg>
  );
}

export function NextIcon(props: IconProps) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="11.75" y="3" width="1.75" height="10" rx="0.5" />
      <path d="M3 3.4a.6.6 0 0 1 .92-.5l6.88 4.6a.6.6 0 0 1 0 1l-6.88 4.6a.6.6 0 0 1-.92-.5V3.4Z" />
    </svg>
  );
}

export function BookmarkIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3.5 2.5h9a.75.75 0 0 1 .75.75v10.5l-5.25-3.1-5.25 3.1V3.25a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

export function HoldIcon(props: IconProps) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.25" />
      <path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M8 3.25v9.5M3.25 8h9.5" />
    </svg>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2.5 6h2.75L8.75 3v10l-3.5-3H2.5V6Z" />
      <path d="M11.25 5.75a3.2 3.2 0 0 1 0 4.5" />
      <path d="M13 4a5.6 5.6 0 0 1 0 8" />
    </svg>
  );
}

export function MuteIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2.5 6h2.75L8.75 3v10l-3.5-3H2.5V6Z" />
      <path d="M11.25 6 14 10M14 6l-2.75 4" />
    </svg>
  );
}

export function FadeIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M2.5 11.5h2c2.5 0 4-7 6.5-7h2.5" />
      <path d="M2.5 13h11" opacity="0.4" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8 2.5v7.25M5.25 5.25 8 2.5l2.75 2.75" />
      <path d="M3 9.75v2.5A1.25 1.25 0 0 0 4.25 13.5h7.5A1.25 1.25 0 0 0 13 12.25v-2.5" />
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M11.2 2.8a1.4 1.4 0 0 1 2 2l-7.1 7.1-2.6.6.6-2.6 7.1-7.1Z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3.25 8.5 6.5 11.75 12.75 4.5" />
    </svg>
  );
}

export function DiscIcon(props: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.25" />
      <path d="M12 6.5a5.5 5.5 0 0 1 5.5 5.5" opacity="0.45" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" {...props}>
      <rect x="3.25" y="3.5" width="9.5" height="10.25" rx="1.5" />
      <path d="M6 3.5v-.75a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v.75" />
    </svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M6.75 9.25 9.25 6.75" />
      <path d="M8.5 4.25 10 2.75a2.65 2.65 0 0 1 3.75 3.75l-1.5 1.5" />
      <path d="M7.5 11.75 6 13.25a2.65 2.65 0 0 1-3.75-3.75l1.5-1.5" />
    </svg>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6.25 3.25h6.5v6.5" />
      <path d="M12.75 3.25 5 11" />
    </svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8 12.5V3.5M4.25 7.25 8 3.5l3.75 3.75" />
    </svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8 3.5v9M4.25 8.75 8 12.5l3.75-3.75" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M4.25 4.25 11.75 11.75M11.75 4.25 4.25 11.75" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.58 3.58l1.06 1.06M11.36 11.36l1.06 1.06M12.42 3.58l-1.06 1.06M4.64 11.36l-1.06 1.06" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M13.25 9.75A5.5 5.5 0 0 1 6.25 2.75a5.5 5.5 0 1 0 7 7Z" />
    </svg>
  );
}

export function ShuffleIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2 4.5h2.4c1.3 0 2.1.7 3 2l1.2 1.8c.9 1.3 1.7 2 3 2H14" />
      <path d="M11.75 8.25 14 10.3l-2.25 2.05" />
      <path d="M2 11.5h2.4c.9 0 1.6-.4 2.3-1.2" />
      <path d="M9.3 6.2c.7-.8 1.4-1.7 2.3-1.7H14" />
      <path d="M11.75 2.45 14 4.5l-2.25 2.05" />
    </svg>
  );
}

export function LoopIcon(props: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12.5 5H4.75A2.75 2.75 0 0 0 2 7.75v.5" />
      <path d="M10.75 3.25 12.75 5l-2 1.75" />
      <path d="M3.5 11h7.75A2.75 2.75 0 0 0 14 8.25v-.5" />
      <path d="M5.25 9.25 3.25 11l2 1.75" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.25" />
      <path d="M10.5 5.5V3.75A1.25 1.25 0 0 0 9.25 2.5h-5.5A1.25 1.25 0 0 0 2.5 3.75v5.5a1.25 1.25 0 0 0 1.25 1.25H5.5" />
    </svg>
  );
}
