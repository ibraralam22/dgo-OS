import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#030712] text-white overflow-hidden">
      {children}
    </div>
  );
}
