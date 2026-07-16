import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Premium background decorative shapes */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo/Branding Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-xl tracking-wider shadow-lg shadow-primary/20 mb-3">
            DGO
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Decent Global Outsourcing
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Enterprise CRM Operating System
          </p>
        </div>

        {/* Centered card content */}
        <div className="glass-card rounded-2xl p-8 shadow-xl shadow-black/40">
          {children}
        </div>
      </div>
    </div>
  );
}
