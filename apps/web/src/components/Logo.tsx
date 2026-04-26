'use client';

import Link from 'next/link';

type LogoProps = {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

function ChipIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="6.5"
        y="6.5"
        width="11"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9.25 12c0-1.519 1.231-2.75 2.75-2.75s2.75 1.231 2.75 2.75-1.231 2.75-2.75 2.75S9.25 13.519 9.25 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function Logo({ href = '/dashboard', size = 'md', className }: LogoProps) {
  const textSize =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';
  const chipSize = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-7 w-7' : 'h-6 w-6';
  const chipTop = size === 'sm' ? '-top-2' : size === 'lg' ? '-top-4' : '-top-3';
  const chipNudgeX = size === 'sm' ? 'translate-x-0.5' : size === 'lg' ? 'translate-x-1' : 'translate-x-0.5';

  return (
    <Link
      href={href}
      className={[
        'inline-flex items-center gap-2 select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        className ?? '',
      ].join(' ')}
      aria-label="RAMO.AI"
    >
      <span className={['font-semibold tracking-tight leading-none', textSize].join(' ')}>
        <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">
          RAMO
        </span>
        <span className="text-blue-600">.</span>
        <span className="text-slate-900">A</span>
        <span className="relative inline-block align-baseline text-slate-900">
          I
          <span
            className={[
              'absolute left-1/2 -translate-x-1/2 text-blue-500',
              chipTop,
              chipNudgeX,
            ].join(' ')}
          >
            <ChipIcon className={chipSize} />
          </span>
        </span>
      </span>
    </Link>
  );
}
