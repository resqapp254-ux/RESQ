# RESQ — Project Guide

## Stack (as it actually is)
- **Web**: Next.js 14 (App Router), plain React (`.js`, not `.tsx`), no Tailwind, no CSS-in-JS library — styling is inline `style={{}}` plus a shared design-system stylesheet at `admin-dashboard/styles/resq-design-system.css` (CSS custom-property tokens under `:root`).
- **Mobile**: Expo / React Native, plain `StyleSheet.create` objects — no NativeWind, no Framer Motion (RN doesn't run it; native `Animated`/`react-native-reanimated` primitives are used instead where motion is needed).
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage), Next.js API routes for anything needing the service-role key.

Do not introduce Tailwind, a CSS-in-JS runtime, or Framer Motion into this codebase without an explicit decision to migrate — it's been deliberately kept as one consistent, dependency-light styling approach. New motion should extend the tokens/keyframes already in `resq-design-system.css`, not add a new animation library.

## Motion principles (Emil Kowalski–style micro-interactions, adapted to plain CSS)

Framer Motion's spring config isn't directly portable to CSS (springs aren't cubic-bezier curves), so the working equivalent used across this codebase is a **fixed overshoot easing** applied to `transform`/`opacity` only:

```css
transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
```

This is the closest practical match to a spring around `stiffness: 220, damping: 26, mass: 1` — enough overshoot to feel tactile, damped enough not to look bouncy/toy-like. Already in use for button hover/press states (`.resq-btn-primary`/`.resq-btn-secondary` in resq-design-system.css) and the flow-diagram/panel entry transitions.

**Rules for any new interactive UI:**
1. Animate only `transform` and `opacity` — never `width`/`height`/`top`/`left` directly (layout thrash). For an expand/collapse, animate `max-height` or `grid-template-rows` on a fixed-content wrapper instead of `height: auto`.
2. Any menu, expandable panel, or modal-like surface gets: enter = fade + slight upward translate + the overshoot curve above; exit = plain fade, faster (~0.12s), no overshoot (overshooting on the way out reads as janky, not tactile).
3. Every animation must have a `prefers-reduced-motion: reduce` fallback — see the block at the bottom of `resq-design-system.css`. Add new animated classes to that block's selector list, don't create a parallel exemption mechanism.
4. Interactive elements get three explicit states, not just default+hover: **hover** (subtle lift/scale), **press/active** (compressed, faster transition), **pending** (an `aria-busy="true"` attribute swaps content for a spinner — see `.resq-btn-primary[aria-busy="true"]`).

## Where things live
- Design tokens: `admin-dashboard/styles/resq-design-system.css` `:root` block.
- Shared routing/dispatch logic: `admin-dashboard/lib/serviceDispatch.js` (mirrored in `mobile/lib/serviceDispatch.js` — keep both in sync by hand, there's no shared package between them).
- Every DB migration ships twice: `supabase/migrations/<timestamp>_<name>.sql` (the real one Supabase Studio times) and a flat mirror `supabase/<name>.sql` (for quick reading without hunting timestamps). Keep both in sync.
- Component playground for auditing UI in isolation: `admin-dashboard/app/super-admin/playground`.
