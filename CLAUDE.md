# RESQ — Project Guide

## Stack (as it actually is)
- **Web**: Next.js 14 (App Router), plain React (`.js`, not `.tsx`). Styling is now a deliberate two-layer mix: the original shared design-system stylesheet at `admin-dashboard/styles/resq-design-system.css` (CSS custom-property tokens under `:root`, inline `style={{}}` everywhere) **plus** Tailwind CSS v3 (`admin-dashboard/tailwind.config.js`, `styles/tailwind.css`) for newer glassmorphic/dashboard UI, and **Framer Motion** for spring-physics entry/exit animation on that newer UI. This was an explicit, approved migration (not the original dependency-light approach) — see "Tailwind + Framer Motion usage" below before assuming either is off-limits.
- **Mobile**: Expo / React Native, plain `StyleSheet.create` objects, plus **Moti** + **react-native-reanimated** (installed, `babel.config.js` wired) for spring/looping animations where native `Animated` alone would be more verbose. **react-native-maps** is installed for in-app live tracking views.
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage), Next.js API routes for anything needing the service-role key.

## Tailwind + Framer Motion usage (web)
- `corePlugins.preflight: false` in `tailwind.config.js` is load-bearing — it keeps Tailwind purely additive so it can never override `resq-design-system.css`'s base/reset styles on a page that hasn't been touched yet. Don't enable preflight.
- Tailwind utility classes and the old inline-`style` + CSS-token approach are meant to coexist on the same element (e.g. `className="glass-card bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80"` layered on top of the existing `.glass-card` class) — this is intentional layering, not something to "clean up" into one system.
- Framer Motion is for the newer glass/dashboard surfaces (login card, super-admin/institution-admin dashboard cards, live routing panel). Shared spring presets live in `admin-dashboard/lib/motionPresets.js` — reuse those instead of inventing new stiffness/damping numbers per component.
- Full-screen decorative backgrounds (`GlobeBackground`, `RadarSweepBackground`, `AmbientGlowBackground`) are additive layers, not alternatives to pick one of — they're designed to stack (`fixed inset-0`, `zIndex: 0`, transparent except where a layer is deliberately the opaque base). `AmbientGlowBackground` in particular has **no background of its own** on purpose, so it can sit on top of the globe/radar layers as an accent instead of hiding them. Don't remove an existing background layer to add a new one; add the new one alongside it, and default to layering/improving over replacing.
- **Semantic classes shared across contexts**: `.resq-badge-open`'s pulse got intensified into a real neon-crimson glow for genuinely live emergencies — but that same class had also been reused (for its red color only) on unrelated "Removed"/"Inactive" badges elsewhere, which then inherited the same urgent pulse. Fixed with a separate `.resq-badge-muted` (neutral, no animation) for those. General rule: before strengthening a shared class's animation, grep every usage first — a color-only reuse of a "live/urgent" class elsewhere in the app will inherit whatever you add.
- Plain CSS motion (below) is still the right tool for anything in `resq-design-system.css`-only pages that haven't been migrated, and for RN screens using native `Animated`/Reanimated directly instead of Moti.

## Motion principles (Emil Kowalski–style micro-interactions, adapted to plain CSS)

Framer Motion's spring config isn't directly portable to CSS (springs aren't cubic-bezier curves), so the working equivalent used on non-migrated pages is a **fixed overshoot easing** applied to `transform`/`opacity` only:

```css
transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
```

This is the closest practical match to a spring around `stiffness: 220, damping: 26, mass: 1` — enough overshoot to feel tactile, damped enough not to look bouncy/toy-like. In use for button hover/press states (`.resq-btn-primary`/`.resq-btn-secondary` in resq-design-system.css) and the flow-diagram/panel entry transitions. Where Framer Motion/Moti are already in play (see above), use their real spring config instead of approximating it in CSS.

**Rules for any new interactive UI:**
1. Animate only `transform` and `opacity` — never `width`/`height`/`top`/`left` directly (layout thrash). For an expand/collapse, animate `max-height` or `grid-template-rows` on a fixed-content wrapper instead of `height: auto`.
2. Any menu, expandable panel, or modal-like surface gets: enter = fade + slight upward translate + the overshoot curve above; exit = plain fade, faster (~0.12s), no overshoot (overshooting on the way out reads as janky, not tactile).
3. Every animation must have a `prefers-reduced-motion: reduce` fallback — see the block at the bottom of `resq-design-system.css`. Add new animated classes to that block's selector list, don't create a parallel exemption mechanism.
4. Interactive elements get three explicit states, not just default+hover: **hover** (subtle lift/scale), **press/active** (compressed, faster transition), **pending** (an `aria-busy="true"` attribute swaps content for a spinner — see `.resq-btn-primary[aria-busy="true"]`).
5. Never remove an existing animation to make room for a new one — layer, extend, or improve it instead. If two effects visually conflict (e.g. an opaque layer painted over an existing one), fix the conflicting layer (make it transparent, reorder it) rather than deleting either animation.

## Where things live
- Design tokens: `admin-dashboard/styles/resq-design-system.css` `:root` block.
- Shared Framer Motion spring presets: `admin-dashboard/lib/motionPresets.js`.
- Shared routing/dispatch logic: `admin-dashboard/lib/serviceDispatch.js` (mirrored in `mobile/lib/serviceDispatch.js` — keep both in sync by hand, there's no shared package between them).
- Every DB migration ships twice: `supabase/migrations/<timestamp>_<name>.sql` (the real one Supabase Studio times) and a flat mirror `supabase/<name>.sql` (for quick reading without hunting timestamps). Keep both in sync.
- Component playground for auditing UI in isolation: `admin-dashboard/app/super-admin/playground`.
