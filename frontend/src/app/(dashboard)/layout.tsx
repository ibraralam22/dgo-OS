'use client';

import React from 'react';
import { AuthGuard } from '../../components/auth/auth-guard';
import { ErrorBoundary } from '../../components/ui/error-boundary';
import { Sidebar } from '../../components/layout/sidebar';
import { Navbar } from '../../components/layout/navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar Container */}
        <Sidebar />

        {/* Workspace Content Shell */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header/Navbar */}
          <Navbar />

          {/* Main workspace view */}
          <main className="flex-1 overflow-y-auto px-6 py-8 relative">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
