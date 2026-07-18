/**
 * Centralised toast helper.
 *
 * All components should import from here instead of reaching into
 * `react-hot-toast` directly.  This keeps the API surface small and lets us
 * change the underlying library (or add custom behaviour) in a single file.
 *
 * Usage:
 *   import { toast } from '@/utils/toast';
 *   toast.success('Saved!');
 *   toast.error('Something went wrong.');
 *   toast.info('Refreshing data…');
 *   toast.loading('Please wait…');
 *   toast.dismiss();          // dismiss all
 *   toast.dismiss(id);        // dismiss one
 *   toast.promise(myPromise, { loading: '…', success: '✓', error: 'Oops' });
 */

import _toast from 'react-hot-toast';

/** Parse an unknown API error into a readable string. */
function parseApiError(err: unknown, fallback = 'An error occurred. Please try again.'): string {
  const e = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const raw = e?.response?.data?.message ?? e?.message ?? fallback;
  return Array.isArray(raw) ? raw.join('\n') : raw;
}

export const toast = {
  /** Green success toast */
  success: (message: string) => _toast.success(message),

  /** Red error toast — also accepts a raw API error object */
  error: (messageOrErr: string | unknown, fallback?: string) => {
    const msg =
      typeof messageOrErr === 'string'
        ? messageOrErr
        : parseApiError(messageOrErr, fallback);
    return _toast.error(msg);
  },

  /** Neutral info toast */
  info: (message: string) =>
    _toast(message, {
      icon: 'ℹ️',
    }),

  /** Spinner loading toast — returns an id you can later dismiss or replace */
  loading: (message: string) => _toast.loading(message),

  /** Dismiss one (by id) or all (no arg) toasts */
  dismiss: (id?: string) => _toast.dismiss(id),

  /**
   * Promise-based toast — shows loading, then resolves to success/error.
   *
   * @example
   *   toast.promise(saveFn(), { loading: 'Saving…', success: 'Saved!', error: 'Failed.' });
   */
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) => _toast.promise(promise, messages),
} as const;
