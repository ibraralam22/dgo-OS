import * as React from 'react';

import { cn } from '@lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-primary/90 active:shadow-none',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-destructive/90 active:shadow-none',
        outline:
          'border border-border/80 bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] hover:bg-accent/50 hover:border-border active:shadow-none',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] hover:bg-secondary/80 active:shadow-none',
        ghost: 'hover:bg-accent/50 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
