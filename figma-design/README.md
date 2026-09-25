# Figma design — Time Portal

High-fidelity designs of every screen, in the real brand: black canvas, crimson accent,
the portfolio **ZH.** mark, and **Hanken Grotesk** (the free match for Upwork's Neue Montreal).
Everything is editable vector SVG, so it imports into Figma as layers.

## Files

| File | What it is |
| --- | --- |
| [`00-design-system.svg`](00-design-system.svg) | Logo, colour palette, type scale, buttons, inputs, badges, chips, cards |
| [`screens/01-sign-in.svg`](screens/01-sign-in.svg) | Sign in — desktop 1440 |
| [`screens/02-dashboard.svg`](screens/02-dashboard.svg) | Member dashboard — desktop 1440 |
| [`screens/03-insights.svg`](screens/03-insights.svg) | Weekly insights — desktop 1440 |
| [`screens/04-admin-console.svg`](screens/04-admin-console.svg) | Admin console — desktop 1440 |
| [`screens/05-sign-in-mobile.svg`](screens/05-sign-in-mobile.svg) | Sign in — mobile 390 |
| [`screens/06-dashboard-mobile.svg`](screens/06-dashboard-mobile.svg) | Member dashboard — mobile 390 |
| [`design-tokens.json`](design-tokens.json) | Colours, type, radius, spacing, breakpoints (W3C design-tokens format) |
| [`png/`](png/) | PNG previews of all of the above |

Logo source files (SVG / PDF / PNG) are in [`../logo/`](../logo/).

## Import into Figma

1. Open a Figma file and add a page called **Time Portal**.
2. Drag every `.svg` from `screens/` and `00-design-system.svg` onto the canvas. Each one
   becomes a frame with editable shapes and **live text layers**.
3. Text uses **Hanken Grotesk**, which is built into Figma (Google Fonts), so it renders
   correctly without installing anything. If you own **Neue Montreal**, select all text and
   swap the font to match Upwork exactly.
4. Tokens: install the **Tokens Studio for Figma** plugin → *Load from file* →
   `design-tokens.json`. Or create Figma **Variables** from the same values by hand.
5. The ZH. mark is a vector path (not text), so it never changes with font availability.

## Keep in sync

These designs mirror `src/app/globals.css` and the components in `src/components/`.
Change a token in `globals.css` and update `design-tokens.json` to match.
