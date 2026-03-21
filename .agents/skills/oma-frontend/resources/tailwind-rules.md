# Tailwind CSS Best Practices

## Core Principles

1. **NO inline styles** - Always use Tailwind classes
2. **Responsive-first** - Design for mobile, scale up
3. **Consistent spacing** - Use Tailwind's spacing scale
4. **Dark mode support** - Use `dark:` variant

## Spacing Scale

Use Tailwind's consistent scale:

```tsx
// ✅ GOOD
<div className="p-4 mb-6 gap-2">

// ❌ BAD - arbitrary values without reason
<div className="p-[17px] mb-[23px]">
```

Standard scale:
- `1` = 0.25rem (4px)
- `2` = 0.5rem (8px)
- `4` = 1rem (16px)
- `6` = 1.5rem (24px)
- `8` = 2rem (32px)

## Responsive Design

Mobile-first approach:

```tsx
// ✅ GOOD - Mobile first, then scale up
<div className="
  grid grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  gap-4
">

// ❌ BAD - Desktop first
<div className="grid-cols-3 sm:grid-cols-1">
```

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Color System

Use semantic color tokens:

```tsx
// ✅ GOOD - Semantic tokens
<div className="bg-background text-foreground border-border">
<button className="bg-primary text-primary-foreground">

// ❌ BAD - Hardcoded colors
<div className="bg-white text-black border-gray-300">
```

Semantic tokens:
- `background` / `foreground`
- `primary` / `primary-foreground`
- `secondary` / `secondary-foreground`
- `muted` / `muted-foreground`
- `accent` / `accent-foreground`
- `destructive` / `destructive-foreground`
- `border` / `input` / `ring`

## Dark Mode

Always support dark mode:

```tsx
// ✅ GOOD
<div className="
  bg-white dark:bg-gray-900
  text-gray-900 dark:text-gray-100
  border-gray-200 dark:border-gray-800
">

// ❌ BAD - No dark mode
<div className="bg-white text-black">
```

## Layout

### Flexbox
```tsx
// Horizontal layout
<div className="flex items-center gap-4">

// Vertical layout
<div className="flex flex-col gap-2">

// Centered content
<div className="flex items-center justify-center min-h-screen">
```

### Grid
```tsx
// Auto-fit columns
<div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

## Typography

```tsx
// Headings
<h1 className="text-4xl font-bold tracking-tight">
<h2 className="text-3xl font-semibold">
<h3 className="text-2xl font-semibold">

// Body text
<p className="text-base leading-7">
<p className="text-sm text-muted-foreground">

// Links
<a className="text-primary hover:underline">
```

## Interactive Elements

### Buttons
```tsx
// Primary button
<button className="
  inline-flex items-center justify-center
  rounded-md px-4 py-2
  bg-primary text-primary-foreground
  hover:bg-primary/90
  disabled:opacity-50 disabled:pointer-events-none
  transition-colors
">

// Ghost button
<button className="
  hover:bg-accent hover:text-accent-foreground
  transition-colors
">
```

### Inputs
```tsx
<input className="
  flex h-10 w-full rounded-md border border-input
  bg-background px-3 py-2
  text-sm
  placeholder:text-muted-foreground
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
  disabled:cursor-not-allowed disabled:opacity-50
" />
```

## Animations

Use Tailwind's transition utilities:

```tsx
// Color transitions
<div className="transition-colors hover:bg-accent">

// Multiple properties
<div className="transition-all duration-200 hover:scale-105">

// Custom animations
<div className="animate-pulse">
<div className="animate-spin">
<div className="animate-bounce">
```

## Accessibility

### Focus States
```tsx
// Always include focus styles
<button className="
  focus:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
  focus-visible:ring-offset-2
">
```

### Screen Reader Only
```tsx
<span className="sr-only">Hidden text for screen readers</span>
```

## Common Patterns

### Card
```tsx
<div className="rounded-lg border bg-card p-6 shadow-sm">
  <h3 className="text-2xl font-semibold mb-2">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Modal Overlay
```tsx
<div className="fixed inset-0 z-50 bg-black/80">
  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
    {/* Modal content */}
  </div>
</div>
```

### Loading State
```tsx
<div className="flex items-center justify-center p-8">
  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
</div>
```

### Skeleton
```tsx
<div className="space-y-2">
  <div className="h-4 w-full bg-muted animate-pulse rounded" />
  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
</div>
```

## cn() Utility

Use `cn()` for conditional classes:

```tsx
import { cn } from '@/lib/utils';

// Merge classes with conditions
<div className={cn(
  'base-class',
  condition && 'conditional-class',
  {
    'variant-a': variant === 'a',
    'variant-b': variant === 'b',
  },
  className // Allow prop overrides
)} />
```

## Arbitrary Values

Only use when absolutely necessary:

```tsx
// ✅ GOOD - Use standard values
<div className="w-64 h-64">

// ⚠️ OK - Special case
<div className="w-[789px]"> // Specific design requirement

// ❌ BAD - Should use standard value
<div className="w-[250px]"> // Just use w-64 (256px)
```

## Custom Utilities

Add to `app/globals.css` using CSS `@theme`:

```css
@import "tailwindcss";

@theme {
  --spacing-18: 4.5rem;
  --color-brand-50: #...;
  --color-brand-900: #...;
}
```

> **Note**: Tailwind v4 uses CSS-based configuration. `tailwind.config.js` is deprecated.

## Performance

### Avoid @apply
Prefer utility classes in JSX over `@apply` in CSS:

```tsx
// ✅ GOOD
<button className="px-4 py-2 bg-primary text-white rounded">

// ❌ BAD
// In CSS: .btn { @apply px-4 py-2 bg-primary text-white rounded; }
<button className="btn">
```

## Linting

Use Prettier plugin for class sorting:

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

`.prettierrc`:
```json
{
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Classes will auto-sort:
```tsx
// Before
<div className="text-white p-4 bg-blue-500 rounded">

// After (auto-sorted)
<div className="rounded bg-blue-500 p-4 text-white">
```

## Checklist

- [ ] No inline styles used
- [ ] Responsive design (mobile-first)
- [ ] Dark mode support (`dark:` variants)
- [ ] Semantic color tokens used
- [ ] Consistent spacing scale
- [ ] Focus states for interactive elements
- [ ] Hover states with transitions
- [ ] Loading/skeleton states
- [ ] Classes sorted (with Prettier plugin)
