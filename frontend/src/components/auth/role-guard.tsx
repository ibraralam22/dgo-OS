'use client';

import React from 'react';
import { useAuthStore } from '../../store/auth-store';
import { ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  fallback,
}: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  const hasAllowedRole =
    allowedRoles.length === 0 || allowedRoles.includes(user.role);

  const hasRequiredPermissions =
    requiredPermissions.length === 0 ||
    requiredPermissions.every((perm) => user.permissions.includes(perm));

  const isAuthorized = hasAllowedRole && hasRequiredPermissions;

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center rounded-lg border border-border bg-card/40 p-10 text-center text-card-foreground shadow-sm backdrop-blur-md max-w-md mx-auto my-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-5 animate-bounce">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold tracking-tight mb-2 text-foreground">Access Restricted</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your current credentials do not have the authorization credentials required to access this portal section. 
          Please contact your administrator if you require additional privilege scopes.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
