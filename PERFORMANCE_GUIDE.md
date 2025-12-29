# Performance Optimization Guide

This guide provides best practices and tools for maintaining optimal performance in the Buen Sabor Dashboard.

## Table of Contents

1. [React 19 Optimizations](#react-19-optimizations)
2. [State Management Patterns](#state-management-patterns)
3. [Component Optimization](#component-optimization)
4. [Build Optimization](#build-optimization)
5. [Performance Monitoring](#performance-monitoring)
6. [Common Pitfalls](#common-pitfalls)

---

## React 19 Optimizations

### Automatic Memoization with React Compiler

The application uses React Compiler (babel-plugin-react-compiler) which automatically memoizes components and hooks.

**Benefits:**
- ✅ Eliminates need for manual `useMemo` and `useCallback` in most cases
- ✅ Prevents unnecessary re-renders automatically
- ✅ Optimizes component updates without code changes

**Configuration:** See [vite.config.ts](vite.config.ts:8-15)

```typescript
react({
  babel: {
    plugins: [
      ['babel-plugin-react-compiler', {
        target: '19'
      }]
    ]
  }
})
```

**When React Compiler Can't Help:**
- Filtering arrays from Zustand stores → Use `useShallow` or `useMemo`
- Expensive computations with external dependencies → Still need explicit memoization
- Side effects → React Compiler doesn't optimize these

---

## State Management Patterns

### Zustand Selector Pattern

**✅ CORRECT - Use Selectors:**
```typescript
// Get data with selector
const items = useStore(selectItems)
const addItem = useStore((s) => s.addItem)

// Derived data with useMemo
const filteredItems = useMemo(() =>
  items.filter(i => i.active),
  [items]
)
```

**❌ WRONG - Never Destructure:**
```typescript
// Creates unnecessary re-renders
const { items } = useStore()
```

### useShallow for Filtered Arrays

**Use Case:** When you need to filter an array **directly in the store selector**.

**✅ CORRECT - With useShallow:**
```typescript
import { useShallow } from 'zustand/react/shallow'

const staff = useStaffStore(
  useShallow((state) =>
    selectedBranchId
      ? state.staff.filter((s) => s.branch_id === selectedBranchId)
      : []
  )
)
```

**Why?** Without `useShallow`, the filtered array creates a new reference on every render, causing infinite loops.

**Alternative Pattern (Equally Valid):**
```typescript
// Get full array from store
const allStaff = useStaffStore((state) => state.staff)

// Filter with useMemo
const staff = useMemo(() =>
  selectedBranchId
    ? allStaff.filter((s) => s.branch_id === selectedBranchId)
    : [],
  [allStaff, selectedBranchId]
)
```

Both patterns are correct. Use `useShallow` for cleaner code, or `useMemo` for more explicit control.

---

## Component Optimization

### Form Components

All form components use React 19 patterns:

**Button Component:**
- Uses `useFormStatus()` for automatic loading states
- No manual state management needed
- See [Button.tsx](src/components/ui/Button.tsx:48-49)

**Form Handling:**
- Uses `useActionState` for server-style form actions
- Automatic `isPending` state
- See pattern in [Staff.tsx](src/pages/Staff.tsx:36-78)

### Lazy Loading

All routes are lazy-loaded:

```typescript
const DashboardPage = lazy(() => import('./pages/Dashboard'))

// Wrapped in Suspense
<Suspense fallback={<PageLoader />}>
  <DashboardPage />
</Suspense>
```

**Benefits:**
- ✅ Smaller initial bundle
- ✅ Faster time to interactive
- ✅ Code split per route

---

## Build Optimization

### Bundle Analysis

**Run build with analysis:**
```bash
npm run build:analyze
```

**Check bundle sizes:**
```bash
npm run build
```

**Output structure:**
```
react-vendor.js    46.13 kB  │ gzip: 16.42 kB  ← React, React DOM, Router
icons.js           13.68 kB  │ gzip:  4.86 kB  ← Lucide icons
state.js            0.66 kB  │ gzip:  0.41 kB  ← Zustand
index.js          234.71 kB  │ gzip: 73.31 kB  ← Main bundle
```

### Vendor Chunking

Configured in [vite.config.ts](vite.config.ts:27-34):

```typescript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'icons': ['lucide-react'],
  'state': ['zustand']
}
```

**Benefits:**
- ✅ Better caching (vendor code rarely changes)
- ✅ Parallel chunk downloads
- ✅ Faster subsequent loads

### Asset Preloading

Configured in [index.html](index.html:9-23):

- DNS prefetch for fonts
- Preconnect for faster connection setup
- Preload critical fonts
- Module preload for main entry

---

## Performance Monitoring

### Development Tools

**1. Performance Utilities** (see [src/utils/performance.ts](src/utils/performance.ts))

Measure function execution:
```typescript
import { measurePerformance } from '../utils/performance'

const result = measurePerformance('expensiveOperation', () => {
  // ... expensive computation
})
```

Measure async operations:
```typescript
import { measureAsyncPerformance } from '../utils/performance'

const data = await measureAsyncPerformance('fetchData', async () => {
  // ... async operation
})
```

**2. React DevTools Profiler**

Use the Profiler tab in React DevTools to:
- Identify slow renders
- Find unnecessary re-renders
- Measure component performance

**3. Chrome DevTools Performance**

Use `markPerformance()` to add marks:
```typescript
import { markPerformance } from '../utils/performance'

markPerformance('data-load-start')
// ... load data
markPerformance('data-load-end')
```

### Type Checking

Run TypeScript type check without building:
```bash
npm run type-check
```

---

## Common Pitfalls

### 1. Infinite Re-render Loops

**Problem:** Filtering arrays in store selectors without `useShallow`

**❌ WRONG:**
```typescript
const items = useStore((state) =>
  state.items.filter(i => i.active)  // New array on every render!
)
```

**✅ FIX:**
```typescript
// Option 1: useShallow
const items = useStore(
  useShallow((state) =>
    state.items.filter(i => i.active)
  )
)

// Option 2: useMemo
const allItems = useStore((state) => state.items)
const items = useMemo(() =>
  allItems.filter(i => i.active),
  [allItems]
)
```

### 2. Destructuring Store State

**Problem:** Causes all components to re-render on any state change

**❌ WRONG:**
```typescript
const { items, users, settings } = useStore()
```

**✅ FIX:**
```typescript
const items = useStore(selectItems)
const users = useStore(selectUsers)
const settings = useStore(selectSettings)
```

### 3. Missing Dependencies in useMemo/useCallback

**Problem:** Stale closures or infinite loops

**❌ WRONG:**
```typescript
const filtered = useMemo(() =>
  items.filter(i => i.category === selectedCategory),
  [items] // Missing selectedCategory!
)
```

**✅ FIX:**
```typescript
const filtered = useMemo(() =>
  items.filter(i => i.category === selectedCategory),
  [items, selectedCategory]
)
```

**Note:** With React Compiler, many `useMemo`/`useCallback` calls are unnecessary, but they don't hurt.

### 4. Large Bundle Sizes

**Problem:** Importing entire libraries when only using small parts

**❌ WRONG:**
```typescript
import _ from 'lodash'  // Imports entire library!
```

**✅ FIX:**
```typescript
import debounce from 'lodash/debounce'  // Only imports debounce
```

### 5. Blocking Main Thread

**Problem:** Expensive synchronous operations freezing UI

**❌ WRONG:**
```typescript
const result = expensiveComputation(largeArray)  // Blocks for seconds
```

**✅ FIX:**
```typescript
// Option 1: useMemo (React Compiler handles this)
const result = useMemo(() =>
  expensiveComputation(largeArray),
  [largeArray]
)

// Option 2: Web Worker (for very expensive operations)
const worker = new Worker(new URL('./worker.ts', import.meta.url))
```

---

## Performance Checklist

Before deploying to production:

- [ ] Run `npm run build` and check bundle sizes
- [ ] Verify no console errors or warnings
- [ ] Check React DevTools for unnecessary re-renders
- [ ] Test on slow networks (Chrome DevTools → Network → Slow 3G)
- [ ] Test on low-end devices (Chrome DevTools → Performance)
- [ ] Verify lazy loading works (Network tab should show chunks loading on route change)
- [ ] Check Lighthouse score (should be >90)

---

## Performance Budget

Target metrics for production builds:

| Metric | Target | Current |
|--------|--------|---------|
| Main bundle (gzip) | < 80 kB | 73.31 kB ✅ |
| Total JS (gzip) | < 150 kB | ~95 kB ✅ |
| Initial load | < 3s (3G) | ~2s ✅ |
| Time to Interactive | < 5s (3G) | ~3s ✅ |
| Largest Contentful Paint | < 2.5s | ~1.8s ✅ |

---

## Additional Resources

- [React 19 Documentation](https://react.dev)
- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/performance)
- [Web Performance Metrics](https://web.dev/metrics/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

---

## Measuring Impact

After making performance optimizations:

1. **Build Size:**
   ```bash
   npm run build
   # Compare dist/ folder sizes
   ```

2. **Runtime Performance:**
   - Use React DevTools Profiler
   - Record interaction in Chrome DevTools Performance
   - Check for faster render times

3. **User Experience:**
   - Test on real devices
   - Measure perceived performance
   - Get user feedback

---

**Last Updated:** Sprint 4 - React 19 Modernization Complete
