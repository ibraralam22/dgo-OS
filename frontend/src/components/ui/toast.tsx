'use client';

import * as React from 'react';
import { Id, ToastContainer, ToastOptions, toast as reactToast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { cn } from '@lib/utils';
import { cva } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

// Toast variant styles
const toastVariants = cva('flex items-center gap-3 p-4 rounded-md shadow-lg border', {
  variants: {
    variant: {
      default: 'bg-background text-foreground border-border',
      success:
        'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800',
      error: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-100 dark:border-red-800',
      warning:
        'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-100 dark:border-yellow-800',
      info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-800',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

// Custom toast component with icon
const CustomToast = ({
  message,
  variant = 'default',
  title,
  onClose,
}: {
  message: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  title?: string;
  onClose?: () => void;
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle className='h-5 w-5 text-green-600' />;
      case 'error':
        return <AlertCircle className='h-5 w-5 text-red-600' />;
      case 'warning':
        return <AlertTriangle className='h-5 w-5 text-yellow-600' />;
      case 'info':
        return <Info className='h-5 w-5 text-blue-600' />;
      default:
        return null;
    }
  };

  return (
    <div className={cn(toastVariants({ variant }))}>
      {getIcon()}
      <div className='flex-1'>
        {title && <div className='mb-1 text-sm font-semibold'>{title}</div>}
        <div className='text-sm'>{message}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className='ml-auto text-foreground/50 transition-colors hover:text-foreground'>
          <X className='h-4 w-4' />
        </button>
      )}
    </div>
  );
};

// Toast utility functions
export interface ToastProps {
  title?: string;
  description: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const toast = {
  success: (message: string, options?: Partial<ToastProps & ToastOptions>): Id => {
    return reactToast.success(message, {
      ...defaultOptions,
      ...options,
    });
  },

  error: (message: string, options?: Partial<ToastProps & ToastOptions>): Id => {
    return reactToast.error(message, {
      ...defaultOptions,
      ...options,
    });
  },

  warning: (message: string, options?: Partial<ToastProps & ToastOptions>): Id => {
    return reactToast.warning(message, {
      ...defaultOptions,
      ...options,
    });
  },

  info: (message: string, options?: Partial<ToastProps & ToastOptions>): Id => {
    return reactToast.info(message, {
      ...defaultOptions,
      ...options,
    });
  },

  default: (message: string, options?: Partial<ToastProps & ToastOptions>): Id => {
    return reactToast(message, {
      ...defaultOptions,
      ...options,
    });
  },

  // Promise-based toast for async operations
  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ): Promise<T> => {
    return reactToast.promise(promise, {
      pending: loading,
      success: {
        render: ({ data }: { data: T }) => (typeof success === 'function' ? success(data) : success),
      },
      error: {
        render: ({ data: errorData }: { data: unknown }) => (typeof error === 'function' ? error(errorData) : error),
      },
    });
  },

  // Dismiss specific toast
  dismiss: (toastId?: Id) => {
    reactToast.dismiss(toastId);
  },

  // Dismiss all toasts
  dismissAll: () => {
    reactToast.dismiss();
  },
};

// ToastProvider component (ToastContainer wrapper)
export const ToastProvider = ({ children, ...props }: React.PropsWithChildren<ToastOptions>) => {
  return (
    <>
      {children}
      <ToastContainer
        position='top-right'
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme='light'
        {...props}
      />
    </>
  );
};

// Hook for managing toasts (compatibility with existing code)
export const useToast = () => {
  return {
    toast,
    dismiss: toast.dismiss,
    toasts: [], // react-toastify manages toasts internally
  };
};

// Individual component exports for backward compatibility
export const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  }
>(({ className, variant = 'default', children, ...props }, ref) => (
  <div ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
    {children}
  </div>
));
Toast.displayName = 'Toast';

export const ToastTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('mb-1 text-sm font-semibold', className)} {...props} />
);
ToastTitle.displayName = 'ToastTitle';

export const ToastDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('text-sm', className)} {...props} />
);
ToastDescription.displayName = 'ToastDescription';

export const ToastClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn('ml-auto text-foreground/50 transition-colors hover:text-foreground', className)}
      {...props}
    >
      <X className='h-4 w-4' />
    </button>
  )
);
ToastClose.displayName = 'ToastClose';

export const ToastAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
ToastAction.displayName = 'ToastAction';

export const ToastViewport = ToastProvider;

// Export types for compatibility
export type ToastActionElement = React.ReactElement<typeof ToastAction>;

export { ToastContainer, toast as default };
