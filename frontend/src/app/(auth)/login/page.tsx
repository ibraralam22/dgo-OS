'use client';

import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useAuthStore } from '../../../store/auth-store';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { authApi } from '../../../services/auth-api';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaTicket, setMfaTicket] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login({ email, password });
      if (response.mfaRequired) {
        setMfaTicket(response.mfaTicket);
      } else {
        login(response.user, response.accessToken, response.organizations);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string | string[] } } };
      const msg = errorResponse.response?.data?.message || 'Invalid email or password.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length < 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.verifyMfa(mfaTicket!, totpCode);
      login(response.user, response.accessToken, response.organizations);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string | string[] } } };
      const msg = errorResponse.response?.data?.message || 'Invalid verification code.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="flex flex-col gap-6 w-full max-w-sm">
      {/* Error Toast / Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </div>
      )}

      {!mfaTicket ? (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-foreground">Sign In</h2>
            <p className="text-xs text-muted-foreground leading-normal">
              Access the Decent Global Outsourcing workspace context using your credentials.
            </p>
          </div>

          {/* Form Fields */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5 relative">
              <Label className="pl-1 text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <Label className="pl-1 text-xs">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                'Authenticate'
              )}
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
              disabled={loading}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Super Admin
            </button>
            <button
              onClick={() => handleDemoLogin('SalesRepresentative')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border/80 bg-secondary/50 text-[10.5px] font-semibold hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              disabled={loading}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Sales Rep
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setMfaTicket(null);
                setTotpCode('');
                setError(null);
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer self-start transition-colors"
              disabled={loading}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Credentials
            </button>
            <h2 className="text-lg font-bold text-foreground mt-2">MFA Verification</h2>
            <p className="text-xs text-muted-foreground leading-normal">
              Multi-Factor Authentication is enabled on this profile. Please submit the 6-digit TOTP code generated by your authenticator app.
            </p>
          </div>

          {/* MFA TOTP Form */}
          <form className="flex flex-col gap-4" onSubmit={handleMfaSubmit}>
            <div className="flex flex-col gap-1.5 relative">
              <Label className="pl-1 text-xs">Verification Code</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="text"
                  maxLength={6}
                  pattern="\d{6}"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="pl-10 text-center tracking-widest text-base font-bold"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying MFA Code...
                </>
              ) : (
                'Verify & Log In'
              )}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
