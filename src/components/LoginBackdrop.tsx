'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * "Blueprint" backdrop for the login page (matches ideas/login-idea.png).
 * Full-viewport inline SVG, pointer-events: none, behind the content. Crimson +
 * off-white technical line-art: labelled text blocks, coordinates, code
 * fragments, intersecting circles, corner registration brackets, plus marks.
 */
export function LoginBackdrop() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Visible from first paint (no fade-in: hiding it hurt Speed Index). Ambient loops only
    // run when the user has not asked for reduced motion.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap.to('.bp-spin', { rotation: 360, transformOrigin: 'center', duration: 160, ease: 'none', repeat: -1 });
      gsap.to('.bp-spin-rev', { rotation: -360, transformOrigin: 'center', duration: 200, ease: 'none', repeat: -1 });
      gsap.to('.bp-flicker', { opacity: 0.15, duration: 2.6, ease: 'sine.inOut', repeat: -1, yoyo: true });
    }, ref);
    return () => ctx.revert();
  }, []);

  const mono = 'var(--font-body)';
  const labelStyle = { fontFamily: mono, fill: 'rgba(230,225,211,0.34)', fontSize: 13, letterSpacing: 1 } as const;
  const codeStyle = { fontFamily: mono, fill: 'rgba(230,225,211,0.20)', fontSize: 13 } as const;
  const coordStyle = { fontFamily: mono, fill: 'rgba(230,225,211,0.30)', fontSize: 13 } as const;

  const tick = (x: number, y: number) => (
    <rect x={x} y={y} width="20" height="3" rx="1.5" fill="rgba(202,45,70,0.85)" />
  );
  const plus = (x: number, y: number, o = 0.4) => (
    <path d={`M${x - 7} ${y} h14 M${x} ${y - 7} v14`} stroke={`rgba(230,225,211,${o})`} strokeWidth="1.4" />
  );
  const bracket = (x: number, y: number, sx: number, sy: number) => (
    <g stroke="rgba(230,225,211,0.35)" strokeWidth="1.5" fill="none">
      <path d={`M${x} ${y} h${44 * sx} M${x} ${y} v${44 * sy}`} />
      <circle cx={x} cy={y} r="4" fill="none" />
    </g>
  );

  return (
    <svg
      ref={ref}
      className="login-backdrop"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="bp-vign" cx="50%" cy="48%" r="72%">
          <stop offset="52%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
        </radialGradient>
        <pattern id="bp-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="rgba(230,225,211,0.035)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="1440" height="900" fill="url(#bp-grid)" />

      {/* ---- intersecting red circles behind the CRT (upper-left) ---- */}
      <g stroke="rgba(202,45,70,0.32)" fill="none" strokeWidth="1.4">
        <g className="bp-spin" style={{ transformBox: 'fill-box' }}>
          <circle cx="360" cy="190" r="120" />
          <circle cx="470" cy="210" r="120" />
          <circle cx="415" cy="120" r="95" />
        </g>
      </g>
      {/* dashed rings */}
      <g stroke="rgba(230,225,211,0.12)" fill="none" strokeWidth="1">
        <circle cx="150" cy="640" r="120" strokeDasharray="3 8" className="bp-spin-rev" style={{ transformBox: 'fill-box' }} />
        <circle cx="150" cy="640" r="70" />
      </g>
      <g stroke="rgba(202,45,70,0.22)" fill="none" strokeWidth="1.2">
        <circle cx="1560" cy="250" r="200" strokeDasharray="2 10" className="bp-spin" style={{ transformBox: 'fill-box' }} />
        <circle cx="1500" cy="560" r="150" />
      </g>

      {/* ---- LEFT text blocks ---- */}
      {tick(80, 132)}
      <text x="108" y="140" style={labelStyle}>ZH_TIMEPORTAL</text>
      <text x="108" y="160" style={labelStyle}>v1.0.0</text>
      <text x="108" y="180" style={labelStyle}>INTERNAL_USE_ONLY</text>

      <text x="90" y="262" style={labelStyle}>ZH</text>
      <text x="90" y="282" style={labelStyle}>TP</text>
      <text x="90" y="302" style={labelStyle}>{'//'}</text>
      <text x="90" y="322" style={labelStyle}>2024</text>

      {tick(80, 430)}
      <text x="108" y="438" style={labelStyle}>TRACK</text>
      <text x="108" y="458" style={labelStyle}>MANAGE</text>
      <text x="108" y="478" style={labelStyle}>APPROVE</text>
      <text x="108" y="498" style={labelStyle}>EXPORT</text>

      {tick(80, 782)}
      <text x="108" y="790" style={labelStyle}>SECURE</text>
      <text x="108" y="810" style={labelStyle}>RELIABLE</text>
      <text x="108" y="830" style={labelStyle}>SCALABLE</text>
      <text x="108" y="850" style={labelStyle}>BUILT FOR TEAMS</text>

      {/* coordinates near the CRT */}
      <text x="655" y="152" style={coordStyle}>37.7749° N</text>
      <text x="655" y="172" style={coordStyle}>122.4194° W</text>

      {/* ---- RIGHT code + labels ---- */}
      <g textAnchor="end">
        <text x="1390" y="78" style={codeStyle}>award = topApprovedSeconds()</text>
        <text x="1390" y="98" style={codeStyle}>week = isCurrentWeek(now)</text>
        <text x="1390" y="118" style={codeStyle}>status: pending {'->'} approved</text>
        <text x="1390" y="138" style={codeStyle}>realtime.subscribe(entries)</text>
        <text x="1390" y="158" style={codeStyle}>export {'->'} out/ (static)</text>
        <text x="1390" y="178" style={codeStyle}>build: 60fps · secure</text>
      </g>
      <text x="1300" y="462" style={labelStyle}>TIME</text>
      <text x="1300" y="482" style={labelStyle}>PEOPLE</text>
      <text x="1300" y="502" style={labelStyle}>PROGRESS</text>
      <text x="1300" y="522" style={labelStyle}>TOGETHER</text>
      {tick(1275, 454)}

      <g textAnchor="end">
        <text x="1390" y="792" style={codeStyle}>const jwt = inspectJwt(token)</text>
        <text x="1390" y="812" style={codeStyle}>if (!jwt.valid) return deny()</text>
        <text x="1390" y="832" style={codeStyle}>policy: user.id = auth.uid()</text>
        <text x="1390" y="852" style={codeStyle}>role == app_metadata.role</text>
        <text x="1390" y="872" style={codeStyle}>SELECT * FROM time_entries</text>
      </g>

      {/* plus marks */}
      {plus(632, 150, 0.5)}
      <g className="bp-flicker">{plus(1180, 610, 0.5)}</g>
      {plus(250, 300, 0.35)}
      {plus(1400, 610, 0.4)}

      {/* corner registration brackets */}
      {bracket(40, 40, 1, 1)}
      {bracket(1400, 40, -1, 1)}
      {bracket(40, 860, 1, -1)}
      {bracket(1400, 860, -1, -1)}

      {/* focus vignette */}
      <rect x="0" y="0" width="1440" height="900" fill="url(#bp-vign)" />
    </svg>
  );
}

export default LoginBackdrop;
