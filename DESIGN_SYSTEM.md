# Design System - IDLink MSU-IIT Theme

## Theme Audit Summary

### tailwind.config.ts ✓ CONSISTENT
All colors in tailwind.config.ts correctly reference CSS variables defined in index.css.

### CSS Variables ✓ MATCHING
All theme colors, gradients, shadows, and transitions are properly defined in `src/index.css`.

### Typography ✓ CONSISTENT
- `font-sans: ['Inter', 'system-ui', 'sans-serif']` - Single font family defined
- Used consistently across components

### Gradients (Used in 18 files) ✓ ACTIVE
| Class | Definition | Usage |
|-------|------------|-------|
| `gradient-primary` | Maroon gradient (0 100% 25% → 0 100% 35%) | Buttons, hero backgrounds |
| `gradient-gold` | Gold gradient (43 69% 53% → 43 75% 65%) | Accent highlights, CTAs |
| `gradient-hero` | 3-stop maroon gradient | Hero section backgrounds |

### Shadows (Used in 14 files) ✓ ACTIVE
| Class | Definition | Usage |
|-------|------------|-------|
| `shadow-card` | 0 2px 8px hsl(0 0% 0% / 0.08) | Card containers |
| `shadow-hover` | 0 8px 24px hsl(0 0% 0% / 0.12) | Hover states on cards |
| `shadow-sm` | Defined but rarely used | General purpose |
| `shadow-md`, `shadow-lg` | Defined but rarely used | General purpose |

---

## Color Palette

### Primary Colors (Maroon)
```
--primary:           hsl(0 100% 25%)   /* Main brand color */
--primary-light:      hsl(0 65% 45%)   /* Hover states */
--primary-dark:       hsl(0 100% 20%)  /* Active states */
--primary-foreground: hsl(0 0% 100%)    /* White text on primary */
```

### Accent Colors (Gold)
```
--accent:            hsl(43 69% 53%)   /* Secondary highlights */
--accent-light:      hsl(43 75% 65%)  /* Lighter gold */
--accent-foreground: hsl(0 0% 15%)    /* Dark text on gold */
```

### Semantic Colors
```
--destructive:       hsl(0 84% 60%)    /* Error states - Red */
--success:           hsl(142 76% 36%)  /* Success states - Green */
--warning:           hsl(38 92% 50%)   /* Warning states - Amber */
--info:              hsl(217 91% 60%)  /* Info states - Blue */
```

### Neutrals
```
--background: hsl(0 0% 98%)           /* Page background - Off-white */
--foreground: hsl(0 0% 15%)          /* Primary text - Near black */
--card:       hsl(0 0% 100%)          /* Card backgrounds - White */
--muted:      hsl(0 0% 95%)           /* Muted backgrounds */
--border:     hsl(0 0% 90%)           /* Borders and dividers */
```

### Dark Mode
Dark mode variables toggle via `.dark` class on `<html>`. Colors shift to:
- Background: `hsl(220 13% 12%)` - Dark charcoal
- Foreground: `hsl(210 16% 95%)` - Light gray
- Primary adjusts slightly: `hsl(0 100% 40%)` - Brighter maroon for dark mode

---

## Shared Components - Priority Update Order

Based on REDESIGN_MAP.md analysis, shared layout components should be updated first:

### Priority 1: Navbar.tsx
- **Pages using it:** Login, Register, Landing, ApplyForID, RevalidateID, TrackStatus, ContractExpiration, StudentDashboard, EmployeeDashboard, StaffDashboard, RecordsManagement, ReviewApplication
- **Why first:** Visible on 12/16 pages - highest impact
- **Current state:** Uses `bg-card`, `border-b`, `shadow-sm` - fully using design tokens
- **Supabase migration:** Login.tsx → `supabase.auth.signInWithPassword()`, Register.tsx → `supabase.auth.signUp()`
- **Estimated effort:** Low (already using design system correctly)

### Priority 2: Footer.tsx
- **Pages using it:** Login, Register, Landing, ApplyForID, RevalidateID, TrackStatus, StudentDashboard, EmployeeDashboard, StaffDashboard, RecordsManagement, ReviewApplication
- **Why second:** Visible on 11/16 pages
- **Current state:** Uses `border-t`, standard spacing - fully using design tokens
- **Estimated effort:** Low (already using design system correctly)

### Priority 3: StaffSidebar.tsx
- **Pages using it:** StaffDashboard, RecordsManagement, ReviewApplication
- **Why third:** Staff-only pages, but critical for admin UX
- **Current state:** Uses `bg-sidebar` with `--sidebar-*` CSS variables ✓
- **Related:** `components/ui/sidebar.tsx` is the raw Radix component (not directly used)
- **Estimated effort:** Low (already using design system correctly)

---

## Component Hierarchy

```
App.tsx (Providers: QueryClient, TooltipProvider, Toaster, Sonner)
├── BrowserRouter
│   └── Routes
│       ├── / (Landing) → Landing.tsx
│       ├── /login (Login) → Login.tsx
│       ├── /register (Register) → Register.tsx
│       ├── /apply (ApplyForID) → ApplyForID.tsx
│       ├── /revalidate (RevalidateID) → RevalidateID.tsx
│       ├── /track (TrackStatus) → TrackStatus.tsx
│       ├── /contract (ContractExpiration) → ContractExpiration.tsx
│       ├── /team (Team) → Team.tsx
│       ├── /student/dashboard → StudentDashboard.tsx
│       ├── /employee/dashboard → EmployeeDashboard.tsx
│       ├── /staff/dashboard → StaffDashboard.tsx
│       ├── /staff/pending → ReviewApplication.tsx
│       ├── /staff/records → RecordsManagement.tsx
│       └── * (NotFound) → NotFound.tsx

Shared Layout Components:
├── Navbar.tsx (on every authenticated page + public pages)
├── Footer.tsx (on every page except dashboards)
├── StaffSidebar.tsx (staff pages only)
└── HighlightedName.tsx (used by Dashboard pages)
```

---

## Unused / Orphaned CSS

### ✓ CLEANED
- `src/App.css` - **DELETED** - Was the Vite React default template CSS (logo animations, card padding, etc.)
  - Contained: `.logo`, `.logo:hover`, `@keyframes logo-spin`, `.card`, `.read-the-docs`
  - These styles were never used in this project (no component imports App.css)

### index.css Status
- `shadow-sm` - Defined but only referenced in index.css itself (not used in components)
- `shadow-md` - Defined but only referenced in index.css itself
- `shadow-lg` - Defined but only referenced in index.css itself
- **Recommendation:** Keep for future use, these are standard Tailwind shadows

---

## Next Steps (From REDESIGN_MAP.md)

1. **Create AuthContext** - Wrap app with Supabase SessionContext provider
2. **Create types.ts** - Define interfaces for: `User`, `Application`, `Contract`, `TeamMember`
3. **Migrate Login.tsx** - Replace `fetch('/api/login')` with `supabase.auth.signInWithPassword()`
4. **Migrate Register.tsx** - Replace `fetch('/api/register')` with `supabase.auth.signUp()`
5. **Migrate Landing.tsx** - Optionally load announcements from Supabase

---

## Verification Checklist

- [x] Theme colors match between tailwind.config.ts and index.css
- [x] Gradients defined and used (gradient-primary, gradient-gold, gradient-hero)
- [x] Shadows defined (shadow-card, shadow-hover in use across 14 files)
- [x] Transitions defined (transition-base, transition-smooth in use)
- [x] Dark mode CSS variables complete
- [x] Sidebar theme variables defined and used by StaffSidebar.tsx
- [x] App.css deleted (orphaned template CSS)
- [x] index.css is clean and well-organized