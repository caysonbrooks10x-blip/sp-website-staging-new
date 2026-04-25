// Custom mini-illustrations for the Claw hub quick-action cards.
// Each tile is a 64×64 composition rendered with inline SVG so it ships
// as part of the bundle (no external CDN dependency, no AI-generated PNG
// look). Designed to feel painterly rather than icon-grade.

import type { ReactElement } from "react";

type ArtProps = { className?: string };

export function ImageGenArt({ className }: ArtProps): ReactElement {
  // A stack of three offset frames with a small spark. Suggests "many
  // images from one prompt" without leaning on a generic landscape icon.
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ig-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="ig-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
        </linearGradient>
      </defs>
      {/* Back card */}
      <rect x="14" y="14" width="32" height="22" rx="3" fill="url(#ig-bg)" opacity="0.45" transform="rotate(-8 30 25)" />
      {/* Middle card */}
      <rect x="16" y="20" width="34" height="24" rx="3.5" fill="url(#ig-card)" opacity="0.85" transform="rotate(-3 33 32)" />
      {/* Front card with a sun and horizon */}
      <g>
        <rect x="14" y="22" width="36" height="26" rx="4" fill="url(#ig-bg)" />
        <circle cx="22" cy="32" r="3" fill="#fde68a" />
        <path d="M14 42 L24 36 L34 40 L50 33 L50 48 L14 48 Z" fill="rgba(15,23,42,0.55)" />
      </g>
      {/* Spark */}
      <g transform="translate(46 14)">
        <path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#fde68a" />
      </g>
    </svg>
  );
}

export function VideoGenArt({ className }: ArtProps): ReactElement {
  // A film strip with a play triangle riding on top of motion lines.
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="vg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Motion streaks */}
      <g stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <line x1="6" y1="22" x2="18" y2="22" />
        <line x1="4" y1="32" x2="14" y2="32" />
        <line x1="6" y1="42" x2="18" y2="42" />
      </g>
      {/* Film strip frame */}
      <rect x="20" y="14" width="38" height="36" rx="5" fill="url(#vg-bg)" />
      {/* Sprocket holes */}
      <g fill="rgba(255,255,255,0.85)">
        <rect x="23" y="18" width="3" height="3" rx="0.6" />
        <rect x="23" y="26" width="3" height="3" rx="0.6" />
        <rect x="23" y="34" width="3" height="3" rx="0.6" />
        <rect x="23" y="42" width="3" height="3" rx="0.6" />
        <rect x="52" y="18" width="3" height="3" rx="0.6" />
        <rect x="52" y="26" width="3" height="3" rx="0.6" />
        <rect x="52" y="34" width="3" height="3" rx="0.6" />
        <rect x="52" y="42" width="3" height="3" rx="0.6" />
      </g>
      {/* Play triangle */}
      <path d="M34 24 L46 32 L34 40 Z" fill="white" stroke="rgba(15,23,42,0.15)" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

export function CreditsArt({ className }: ArtProps): ReactElement {
  // A leaning stack of three coins with a faint sparkle.
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id="cg-coin" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="55%" stopColor="rgba(254,243,199,0.95)" />
          <stop offset="100%" stopColor="rgba(217,119,6,0.85)" />
        </radialGradient>
      </defs>
      {/* Glow */}
      <ellipse cx="32" cy="50" rx="22" ry="3" fill="url(#cg-bg)" opacity="0.4" />
      {/* Bottom coin */}
      <g transform="translate(0 0)">
        <ellipse cx="22" cy="42" rx="14" ry="4" fill="rgba(15,23,42,0.35)" />
        <ellipse cx="22" cy="40" rx="14" ry="4" fill="url(#cg-coin)" />
      </g>
      {/* Middle coin */}
      <g transform="translate(8 -8)">
        <ellipse cx="22" cy="42" rx="14" ry="4" fill="rgba(15,23,42,0.3)" />
        <ellipse cx="22" cy="40" rx="14" ry="4" fill="url(#cg-coin)" />
      </g>
      {/* Top coin with star */}
      <g transform="translate(16 -16)">
        <ellipse cx="22" cy="42" rx="14" ry="4.5" fill="rgba(15,23,42,0.25)" />
        <ellipse cx="22" cy="40" rx="14" ry="4.5" fill="url(#cg-coin)" />
        <path d="M22 36 L23 39 L26 39.4 L23.5 41 L24 44 L22 42.5 L20 44 L20.5 41 L18 39.4 L21 39 Z" fill="rgba(180,83,9,0.85)" />
      </g>
      {/* Sparkle */}
      <g transform="translate(50 14)">
        <path d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" fill="#fde68a" />
      </g>
    </svg>
  );
}
