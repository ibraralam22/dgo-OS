<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

## Source: `.kiro/steering/api-services.md`

---

## inclusion: always

# API Services Pattern

## Service Layer Structure

Place all API logic in `@services/*` directory organized by feature:

```
src/services/
  ├── leads/
  │   ├── lead.service.ts
  │   └── draft-booking.service.ts
  ├── payouts/
  │   ├── payout.service.ts
  │   └── settlement.service.ts
  └── services.service.ts
```

## Service Function Pattern

Create reusable functions with proper TypeScript types:

```typescript
import axios from 'axios';

export const getUser = async (userId: string): Promise<User> => {
  const { data } = await axios.get(`/api/users/${userId}`);
  return data;
};
```

## React Query Integration

Place React Query hooks in `@query/*` directory:

```typescript
import { getUser } from '@services/userService';

import { useQuery } from '@tanstack/react-query';

export const useUser = (userId: string) => {
  return useQuery(['user', userId], () => getUser(userId));
};
```

Use descriptive filenames like `user.data.ts` for query functions.

## API Documentation

**Before implementing any API integration:**

1. Check `docs/` folder for API documentation
2. Review endpoint specifications
3. Verify request/response types
4. Follow documented patterns

## Source: `.kiro/steering/code-quality.md`

---

## inclusion: always

# Code Quality Standards

## Linting and Formatting

- Follow **ESLint** rules configured in `eslint.config.mjs`
- Use **Prettier** for code formatting (`.prettierrc`)
- Run linting before commits (Husky pre-commit hook)

## Accessibility

- Use Radix UI for built-in accessibility
- Test with keyboard navigation
- Test with screen readers
- Ensure proper ARIA attributes
- Maintain proper heading hierarchy
- Provide alt text for images

## Performance

- Lazy load components with dynamic imports
- Optimize images with next/image
- Use React Suspense for async operations
- Implement proper loading states
- Avoid unnecessary re-renders

## Best Practices

- Write self-documenting code
- Keep functions small and focused
- Follow DRY (Don't Repeat Yourself)
- Use meaningful variable and function names
- Add comments for complex logic only
- Prefer composition over inheritance

## Source: `.kiro/steering/nextjs-conventions.md`

---

## inclusion: always

# Next.js App Router Conventions

## Component Types

- **Prefer server components** by default
- Add `'use client';` directive only when client-side interactivity is required
- Use `async` components for data fetching with React Suspense

## File-Based Routing

- Use `app/` directory for all routes
- `layout.tsx` - Shared layouts
- `page.tsx` - Route pages
- `loading.tsx` - Loading states
- `error.tsx` - Error handling

## Metadata

Use the `metadata` object in server components:

```typescript
export const metadata = {
  title: 'Page Title',
  description: 'Page description',
};
```

## Navigation

Always use Next.js `Link` component for internal routing:

```tsx
import Link from 'next/link';

<Link href='/about'>About Us</Link>;
```

## Performance

- Use `dynamic import()` for lazy-loading components
- Implement proper loading states with Suspense
- Optimize images with `next/image`

## Source: `.kiro/steering/project-structure.md`

---

## inclusion: always

# Project Structure and Path Aliases

This is a **Next.js** project using the **App Router** with TypeScript.

## Path Aliases

Always use these path aliases instead of relative imports:

- `@app/*` → `src/app`
- `@models/*` → `src/models`
- `@customTypes/*` → `src/types`
- `@routes/*` → `src/routes` (internal page routes)
- `@components/*` → `src/components`
- `@services/*` → `src/services` (API calls)
- `@query/*` or `@data/*` → `src/data` (React Query functions)
- `@lib/*` → `src/lib`
- `@utils/*` → `src/utils` (utility/helper functions)
- `@store/*` → `src/store` (Zustand stores)
- `@assets/*` → `src/assets`
- `@src/*` → `src` (general)
- `@public/*` → `public` (static files)

## Asset Management

- Use **kebab-case** for all asset names (e.g., `user-avatar.png`)
- Place assets in `public/` folder within component-specific folders
- Common shared assets go in `public/common/`

## API Documentation

**Always check `docs/` folder before implementing features** - it contains API documentation for:

- `docs/admin-api-integration.md`
- `docs/admin-lead-intake-api.md`
- `docs/admin-mechanics-api.md`
- `docs/nearby-mechanics-api.md`

## Source: `.kiro/steering/state-management.md`

---

## inclusion: always

# State Management with Zustand

## Store Structure

Place all Zustand stores in `@store/*` directory organized by feature.

## Store Pattern

Create modular, feature-specific stores:

```typescript
import { create } from 'zustand';

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

## Best Practices

- Keep stores focused on specific features
- Use TypeScript interfaces for state shape
- Provide clear action names
- Avoid storing server state (use React Query instead)
- Use Zustand for UI state, user preferences, and global app state

## Source: `.kiro/steering/typescript-standards.md`

---

## inclusion: always

# TypeScript Standards

## Type Annotations

Always provide explicit types for:

- Function parameters
- Function return types
- Component props
- State variables

## Type Definitions

Store type definitions in:

- `@customTypes/*` - General type definitions
- `@models/*` - Data models and entities

Example model:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
```

## Component Props

Use interfaces for component props:

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onClick, variant = 'primary', disabled }: ButtonProps) {
  // implementation
}
```

## Best Practices

- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, and mapped types
- Avoid `any` - use `unknown` if type is truly unknown
- Use strict TypeScript configuration
- Leverage type inference where appropriate

## Source: `.kiro/steering/ui-components.md`

---

## inclusion: always

# UI Component Guidelines

## Radix UI + Tailwind CSS

Use **Radix UI primitives** for all interactive components combined with:

- **Tailwind CSS** for styling
- **class-variance-authority (cva)** for variants
- **tailwind-merge (cn)** for conditional classes

## Available Radix UI Components

- `@radix-ui/react-accordion`
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-avatar`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-label`
- `@radix-ui/react-menubar`
- `@radix-ui/react-popover`
- `@radix-ui/react-progress`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slider`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-toast`
- `@radix-ui/react-tooltip`

## Component Pattern

Follow shadcn/ui architecture with compound components:

```tsx
import { forwardRef } from 'react';

import { cn } from '@lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';

const buttonVariants = cva('inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    },
    size: {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

## Modular Components

- Create **small, single-responsibility** components
- Place reusable components in `@components/*`
- Use **forwardRef** for ref forwarding
- Implement proper TypeScript interfaces
- Follow accessibility best practices (Radix UI provides this)

## Utility Function

Ensure `@lib/utils.ts` has the cn utility:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Component Folder Structure (UI)

```
component-name/
├── component-name.tsx
├── utils.ts
├── types/
│   ├── component-name.types.ts
│   └── child-component1.types.ts
└── child-component/
    ├── child-component1.tsx
    └── child-component2.tsx
```

### Component Structure

```typescript
// src/components/feature/feature-component.tsx
import React from 'react';

interface IFeatureComponentProps {
  // Props definition
}

export const FeatureComponent: React.FC<IFeatureComponentProps> = (props) => {
  // Component logic
  return <div>{/* JSX */}</div>;
};
```

## Component Declaration Style

- Prefer arrow-function component declarations with `React.FC` typing.
- Example:

```typescript
interface IExampleProps {
  // Props definition
}

export const Example: React.FC<IExampleProps> = (props) => {
  return <div />;
};
```

## Always-On Skills

- Use `next-dev-loop` to verify Next.js runtime behavior after editing app code.
- Use `next-cache-components-adoption` when adopting or auditing Cache Components.
- Use `next-cache-components-optimizer` to optimize static shell render times and navigation transitions.
- Use `next-partial-prefetching-adoption` when configuring or troubleshooting Partial Prefetching.
- Follow `modern-web-guidance` for any UI/UX, styling (vanilla CSS, HTML dialog/popover/anchor positioning), and web performance adjustments.

<!-- END:nextjs-agent-rules -->
