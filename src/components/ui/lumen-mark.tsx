"use client";

import { useId } from "react";

/**
 * LumenMark — reusable product logo component.
 * Renders a flowing calligraphic stroke in metallic gold.
 * Gradient IDs are namespaced via useId for multi-instance use.
 */
export function LumenMark({
  size = 24,
  bare = true,
  className,
}: {
  size?: number;
  bare?: boolean;
  className?: string;
}) {
  const uid = useId();
  const gold = `lum-g-${uid}`;
  const sheen = `lum-sh-${uid}`;
  const tile = `lum-t-${uid}`;
  const bevel = `lum-bv-${uid}`;
  const glow = `lum-gl-${uid}`;

  const d =
    "M 138 50 C 130 47, 118 51, 110 63 C 102 75, 92 89, 85 103 C 78 117, 82 127, 98 125 C 114 123, 130 131, 132 147 C 134 163, 120 172, 102 168";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gold} x1="55" y1="38" x2="148" y2="172" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFEAB0" />
          <stop offset="0.42" stopColor="#E8C265" />
          <stop offset="0.72" stopColor="#B9872C" />
          <stop offset="1" stopColor="#7E5613" />
      </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
        {!bare && (
          <>
            <radialGradient id={tile} cx="0.35" cy="0.18" r="1.05">
              <stop offset="0" stopColor="#1F1F2A" />
              <stop offset="0.55" stopColor="#121218" />
              <stop offset="1" stopColor="#07070B" />
          </radialGradient>
            <linearGradient id={bevel} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>
            <radialGradient id={glow} cx="0.5" cy="0.5" r="0.46">
              <stop offset="0" stopColor="#E8C265" stopOpacity="0.16" />
              <stop offset="0.7" stopColor="#E8C265" stopOpacity="0.04" />
              <stop offset="1" stopColor="#E8C265" stopOpacity="0" />
          </radialGradient>
          </>
        )}
    </defs>

      {!bare && (
        <>
          <rect x="4" y="4" width="192" height="192" rx="48" fill={`url(#${tile})`} />
          <rect x="4" y="4" width="192" height="192" rx="48" fill={`url(#${bevel})`} />
          <rect x="4.5" y="4.5" width="191" height="191" rx="47.5" stroke="#FFFFFF" strokeOpacity="0.06" strokeWidth="1" fill="none" />
          <circle cx="100" cy="100" r="78" fill={`url(#${glow})`} />
          <circle cx="100" cy="100" r="68" stroke="#E8C265" strokeOpacity="0.18" strokeWidth="0.8" fill="none" />
        </>
      )}

      <path
        d={d}
        fill="none"
        stroke="#000000"
        strokeOpacity="0.45"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0.6,1.4)"
      />
      <path
        d={d}
        fill="none"
        stroke={`url(#${gold})`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke={`url(#${sheen})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.55"
        transform="translate(0,-1.8)"
      />
      <circle cx="138" cy="50" r="2.6" fill="#FFE9A8" opacity="0.9" />
  </svg>
  );
}
