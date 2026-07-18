'use client';

/**
 * ToastProvider
 *
 * Drop this once inside the root layout.  All toast() calls anywhere in the
 * app will render through this single Toaster instance.
 *
 * Styling mirrors the app's glassmorphism / dark-mode design tokens so toasts
 * feel native rather than bolted-on.
 */

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerStyle={{ top: 20, right: 20 }}
      toastOptions={{
        // Default for all variants
        duration: 4000,
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '14px',
          fontSize: '13px',
          fontWeight: '500',
          lineHeight: '1.5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.2)',
          padding: '12px 16px',
          maxWidth: '380px',
        },

        // ✓ Success
        success: {
          duration: 3500,
          iconTheme: { primary: '#10b981', secondary: 'hsl(var(--card))' },
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderLeft: '3px solid #10b981',
          },
        },

        // ✗ Error
        error: {
          duration: 5000,
          iconTheme: { primary: '#ef4444', secondary: 'hsl(var(--card))' },
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderLeft: '3px solid #ef4444',
          },
        },

        // ⏳ Loading
        loading: {
          duration: Infinity,
          iconTheme: { primary: 'hsl(var(--primary))', secondary: 'hsl(var(--card))' },
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            borderLeft: '3px solid hsl(var(--primary))',
          },
        },
      }}
    />
  );
}
