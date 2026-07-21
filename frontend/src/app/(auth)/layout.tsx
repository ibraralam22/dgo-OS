import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#08090a] text-white overflow-hidden">
      {children}
    </div>
  );
}
