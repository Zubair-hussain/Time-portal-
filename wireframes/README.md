# Wireframes — Time Portal

Low-fidelity layouts of every screen, drawn from the real components in `src/`. Grey boxes
only (no brand colour) so the structure is easy to discuss. Blue numbered dots are
annotations; the notes are listed on the right of each frame.

| # | Screen | Frame | Vector | Preview |
| --- | --- | --- | --- | --- |
| 01 | Sign in | Desktop 1440 × 900 | [`01-sign-in.svg`](01-sign-in.svg) | [png](png/01-sign-in.png) |
| 02 | Member dashboard | Desktop 1440 × 900 | [`02-dashboard.svg`](02-dashboard.svg) | [png](png/02-dashboard.png) |
| 03 | Weekly insights | Desktop 1440 × 820 | [`03-insights.svg`](03-insights.svg) | [png](png/03-insights.png) |
| 04 | Admin console | Desktop 1440 × 1380 | [`04-admin-console.svg`](04-admin-console.svg) | [png](png/04-admin-console.png) |
| 05 | Sign in | Mobile 390 × 844 | [`05-sign-in-mobile.svg`](05-sign-in-mobile.svg) | [png](png/05-sign-in-mobile.png) |
| 06 | Member dashboard | Mobile 390 × 1180 | [`06-dashboard-mobile.svg`](06-dashboard-mobile.svg) | [png](png/06-dashboard-mobile.png) |

## User flow

```
Sign in (01 / 05) ──► Dashboard (02 / 06) ──► Insights (03)
                              │
                              └──► Admin console (04)   ← admins only; route /time/Portal/admIn/
```

- There is **no sign-up screen**: accounts are created by an admin from the console (04).
- Desktop uses the `.container` grid (1080 max, 20 px gutter). Cards stack to one column
  under 720 px, the sign-in CRT stacks above the card under 820 px, and the admin split
  becomes one column under 1000 px.

The coloured, Figma-ready versions of the same frames are in [`../figma-design/`](../figma-design/).
