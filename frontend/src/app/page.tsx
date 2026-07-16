'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth-store';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand client hydration to finish before reading local session keys
  useEffect(() => {
    const handle = setTimeout(() => {
      setIsHydrated(true);
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isHydrated, isAuthenticated, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
        <span className="text-sm font-medium tracking-wide text-muted-foreground animate-pulse">
          Routing context...
        </span>
      </div>
    </div>
  );
}
