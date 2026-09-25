'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { DOT_PATH, ZH_PATH } from '@/components/ZHLogo';

export interface RetroComputerProps {
  /** When true, the CRT plays an in-screen loading bar. */
  loading?: boolean;
  size?: number;
}

/**
 * A retro CRT computer rendered entirely as inline SVG (transparent background —
 * no white box). It sits still when the page opens (a subtle GSAP intro, then
 * idle with a slow scanline) and, when `loading` is true, animates a loading bar
 * and a percentage counter inside the screen.
 */
export function RetroComputer({ loading = false, size = 340 }: RetroComputerProps) {
  const rootRef = useRef<SVGSVGElement>(null);
  const scanRef = useRef<SVGRectElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const pctRef = useRef<SVGTextElement>(null);
  const ledRef = useRef<SVGCircleElement>(null);
  const idleRef = useRef<SVGGElement>(null);
  const loadRef = useRef<SVGGElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Mount intro + ambient idle animations (computer stays still).
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Slide in without hiding: the CRT is painted from the first frame.
      gsap.from(rootRef.current, { y: 18, duration: 0.6, ease: 'power3.out' });
      // Slow scanline drifting down the screen.
      gsap.fromTo(
        scanRef.current,
        { attr: { y: 70 } },
        { attr: { y: 196 }, duration: 3.2, ease: 'none', repeat: -1 },
      );
      // Power LED soft pulse.
      gsap.to(ledRef.current, { opacity: 0.35, duration: 1, ease: 'sine.inOut', repeat: -1, yoyo: true });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  // Loading bar animation, driven by the `loading` prop.
  useEffect(() => {
    tlRef.current?.kill();
    if (!loading) {
      gsap.set(loadRef.current, { autoAlpha: 0 });
      gsap.set(idleRef.current, { autoAlpha: 1 });
      gsap.set(fillRef.current, { attr: { width: 0 } });
      return;
    }

    gsap.set(idleRef.current, { autoAlpha: 0 });
    gsap.set(loadRef.current, { autoAlpha: 1 });

    const counter = { v: 0 };
    const tl = gsap.timeline();
    tl.set(fillRef.current, { attr: { width: 0 } })
      // Fill quickly to ~70%, then ease to 92% (feels like a real installer).
      .to(fillRef.current, { attr: { width: 150 }, duration: 0.9, ease: 'power2.out' })
      .to(fillRef.current, { attr: { width: 197 }, duration: 1.1, ease: 'power1.inOut' })
      .to(counter, {
        v: 92,
        duration: 2.0,
        ease: 'power1.inOut',
        onUpdate: () => {
          if (pctRef.current) pctRef.current.textContent = `${Math.round(counter.v)}%`;
        },
      }, 0);
    // Subtle screen flicker while working.
    tl.to(rootRef.current, { opacity: 0.94, duration: 0.08, repeat: 5, yoyo: true }, 0);
    tlRef.current = tl;

    return () => {
      tl.kill();
    };
  }, [loading]);

  return (
    <svg
      ref={rootRef}
      width={size}
      height={size * (400 / 360)}
      viewBox="0 0 360 400"
      role="img"
      aria-label="Retro computer"
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <defs>
        <linearGradient id="rc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7e1d3" />
          <stop offset="100%" stopColor="#c3bcab" />
        </linearGradient>
        <linearGradient id="rc-body2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8d2c2" />
          <stop offset="100%" stopColor="#b3ab98" />
        </linearGradient>
        <linearGradient id="rc-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e1013" />
          <stop offset="100%" stopColor="#05070a" />
        </linearGradient>
        <linearGradient id="rc-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ca2d46" />
          <stop offset="100%" stopColor="#ff5a72" />
        </linearGradient>
        <radialGradient id="rc-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="rgba(202,45,70,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <clipPath id="rc-clip">
          <rect x="56" y="60" width="248" height="150" rx="10" />
        </clipPath>
        <pattern id="rc-screengrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgba(202,45,70,0.14)" strokeWidth="1" />
        </pattern>
        <filter id="rc-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="rc-amb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(202,45,70,0.28)" />
          <stop offset="100%" stopColor="rgba(202,45,70,0)" />
        </radialGradient>
      </defs>

      {/* ambient red glow behind the CRT */}
      <ellipse cx="180" cy="200" rx="180" ry="120" fill="url(#rc-amb)" />
      {/* floor reflection glow */}
      <ellipse cx="180" cy="352" rx="140" ry="16" fill="rgba(202,45,70,0.14)" />

      {/* Monitor body */}
      <rect x="24" y="24" width="312" height="240" rx="22" fill="url(#rc-body)" stroke="#9a927e" strokeWidth="2" />
      {/* Screen bezel */}
      <rect x="46" y="50" width="268" height="170" rx="16" fill="#2b2a27" />
      {/* Screen */}
      <rect x="56" y="60" width="248" height="150" rx="10" fill="url(#rc-screen)" />
      <rect x="56" y="60" width="248" height="150" rx="10" fill="url(#rc-glow)" />

      {/* Screen contents (clipped to the glass) */}
      <g clipPath="url(#rc-clip)">
        {/* red screen grid */}
        <rect x="56" y="60" width="248" height="150" fill="url(#rc-screengrid)" />
        {/* Moving scanline */}
        <rect ref={scanRef} x="56" y="70" width="248" height="2" fill="rgba(255,90,114,0.20)" />

        {/* IDLE state — glowing portfolio "ZH." mark + READY_ */}
        <g ref={idleRef}>
          <g transform="translate(152.55 140.2) scale(0.634)" filter="url(#rc-glow)">
            <path d={ZH_PATH} fill="#f5f4f0" />
            <path d={DOT_PATH} fill="#ff3b57" />
          </g>
          <text
            x="180"
            y="172"
            textAnchor="middle"
            style={{ fontFamily: 'var(--font-body)' }}
            fontSize="12"
            letterSpacing="5"
            fill="#c9b7a0"
          >
            READY
          </text>
          <rect x="212" y="163" width="8" height="12" fill="#ff3b57">
            <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* LOADING state — progress bar + percent */}
        <g ref={loadRef} style={{ opacity: 0 }}>
          <text
            x="70"
            y="108"
            style={{ fontFamily: 'var(--font-body)' }}
            fontSize="11"
            letterSpacing="2"
            fill="#e7e1d3"
          >
            SIGNING IN…
          </text>
          {/* track */}
          <rect x="70" y="128" width="197" height="14" rx="7" fill="#1c1f24" stroke="#3a3f47" />
          {/* fill */}
          <rect ref={fillRef} x="70" y="128" width="0" height="14" rx="7" fill="url(#rc-fill)" />
          <text
            ref={pctRef}
            x="70"
            y="166"
            style={{ fontFamily: 'var(--font-body)' }}
            fontSize="11"
            fill="#8a9a86"
          >
            0%
          </text>
        </g>
      </g>

      {/* Bezel details */}
      <circle ref={ledRef} cx="70" cy="238" r="4" fill="#ca2d46" />
      <rect x="250" y="232" width="54" height="10" rx="5" fill="#b3ab98" />

      {/* Neck + base */}
      <path d="M150 264 h60 l10 34 h-80 z" fill="url(#rc-body2)" stroke="#9a927e" strokeWidth="2" />
      <rect x="70" y="298" width="220" height="26" rx="12" fill="url(#rc-body)" stroke="#9a927e" strokeWidth="2" />
      <rect x="92" y="324" width="176" height="14" rx="7" fill="url(#rc-body2)" stroke="#9a927e" strokeWidth="2" />
    </svg>
  );
}

export default RetroComputer;
