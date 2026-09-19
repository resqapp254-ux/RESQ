// Shared Framer Motion spring presets so every "glossy card" surface
// (dashboards, panels, modals) animates with the same feel instead of
// each screen picking its own numbers.

// Cards, modals, small UI that pops in on its own.
export const SPRING_SNAPPY = { type: 'spring', stiffness: 300, damping: 25, mass: 0.8 }

// Larger surfaces — drawers, sidebars, dashboard grids.
export const SPRING_SMOOTH = { type: 'spring', stiffness: 220, damping: 28 }

// Dashboard card grids: stagger each child's entrance.
export const staggerContainer = (staggerChildren = 0.06) => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren } }
})

export const staggerCard = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING_SNAPPY }
}

// Dashboard-page card cascade (super-admin / institution-admin).
export const SPRING_DASHBOARD = { type: 'spring', mass: 1, stiffness: 200, damping: 25 }

export const dashboardStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } }
}

export const dashboardCard = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING_DASHBOARD }
}
