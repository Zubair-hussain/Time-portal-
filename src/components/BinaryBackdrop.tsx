import React from 'react';

/**
 * Faint binary-digit texture for the admin console. Static, decorative, behind content.
 * Generated deterministically (no Math.random) so server and client render identically.
 */
const ROWS = 34;
const COLS = 96;

function row(seed: number): string {
  let out = '';
  let x = seed * 2654435761;
  for (let i = 0; i < COLS; i += 1) {
    x = (x ^ (x << 13)) >>> 0;
    x = (x ^ (x >>> 17)) >>> 0;
    x = (x ^ (x << 5)) >>> 0;
    out += x & 1 ? '1' : '0';
  }
  return out;
}

export function BinaryBackdrop() {
  const rows = Array.from({ length: ROWS }, (_, i) => row(i + 7));
  return (
    <svg className="binary-backdrop" viewBox={`0 0 ${COLS * 14} ${ROWS * 22}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="bin-fade" cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.05" />
        </radialGradient>
        <mask id="bin-mask">
          <rect width="100%" height="100%" fill="url(#bin-fade)" />
        </mask>
      </defs>
      <g mask="url(#bin-mask)" style={{ fontFamily: 'var(--font-body)' }} fontSize="15" fill="rgba(202,45,70,0.5)">
        {rows.map((r, i) => (
          <text key={i} x="0" y={20 + i * 22} letterSpacing="5.3">
            {r}
          </text>
        ))}
      </g>
    </svg>
  );
}

export default BinaryBackdrop;
