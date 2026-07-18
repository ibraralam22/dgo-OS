'use client';

import React, { useState } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { useAuthStore } from '@store/auth-store';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { authApi } from '@services/auth-api';
import { toast } from '@utils/toast';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      login(response.user, response.accessToken, response.organizations);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch {
      // Error toast is fired by the API client interceptor — no duplicate needed
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
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
    </div>
  );
}
