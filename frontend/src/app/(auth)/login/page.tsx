'use client';

import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useAuthStore } from '../../../store/auth-store';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleDemoLogin = (role: 'SuperAdmin' | 'TenantAdmin' | 'SalesRepresentative' | 'ClientContact') => {
    // Generate mock credentials based on role selection
    const mockUser = {
      id: 'mock-user-uuid',
      email: `${role.toLowerCase()}@dgo-outsourcing.com`,
      firstName: 'Demo',
      lastName: role,
      role: role,
      permissions: role === 'SuperAdmin' || role === 'TenantAdmin' 
        ? ['leads:read', 'leads:write', 'clients:read', 'clients:write', 'opportunities:read', 'billing:read', 'tickets:read']
        : role === 'SalesRepresentative'
        ? ['leads:read', 'leads:write', 'clients:read', 'opportunities:read']
        : ['tickets:read', 'clients:read'], // Client Portal
    };

    const mockOrgs = [
      { id: 'org-1-uuid', name: 'DGO Europe Division', subdomain: 'dgo-eu' },
      { id: 'org-2-uuid', name: 'DGO North America Inc', subdomain: 'dgo-na' },
    ];

    login(mockUser, 'mock-jwt-token-string', mockOrgs);
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-foreground">Sign In</h2>
        <p className="text-xs text-muted-foreground leading-normal">
          Access the Decent Global Outsourcing workspace context using your credentials.
        </p>
      </div>

      {/* Form Fields */}
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1.5 relative">
          <Label className="pl-1">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 relative">
          <Label className="pl-1">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="pl-10"
            />
          </div>
        </div>

        <Button variant="primary" className="w-full mt-2" onClick={() => handleDemoLogin('TenantAdmin')}>
          Authenticate
        </Button>
      </form>

      {/* Separator */}
      <div className="relative flex items-center justify-center my-1 select-none">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>
        <span className="relative px-3 text-[10px] font-semibold text-muted-foreground bg-card uppercase tracking-widest">
          Developer Demos
        </span>
      </div>

      {/* Demo Roles Quick Login Grid */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleDemoLogin('SuperAdmin')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border/80 bg-secondary/50 text-[10.5px] font-semibold hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Super Admin
        </button>
        <button
          onClick={() => handleDemoLogin('SalesRepresentative')}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border/80 bg-secondary/50 text-[10.5px] font-semibold hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Sales Rep
        </button>
      </div>
    </div>
  );
}
