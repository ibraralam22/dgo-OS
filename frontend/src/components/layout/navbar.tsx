'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../../store/auth-store';
import { LogOut, ChevronDown, Building, User } from 'lucide-react';
import { NotificationBell } from '@components/notifications/notification-bell';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();
  const { user, logout, organizations, activeOrganizationId, setActiveOrganizationId } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleOrgSelect = (orgId: string) => {
    setActiveOrganizationId(orgId);
    setIsDropdownOpen(false);
  };

  const activeOrg = organizations.find((org) => org.id === activeOrganizationId);

  return (
    <header className="glass-navbar sticky top-0 z-40 w-full h-16 flex items-center justify-between px-6 text-foreground">
      {/* Workspace Active Path/Title */}
      <div className="flex items-center gap-2">
        <Building className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-wide text-foreground">
          {activeOrg ? activeOrg.name : 'DGO Workspace'}
        </span>
      </div>

      {/* Actions and Profile Settings */}
      <div className="flex items-center gap-4">
        {/* Tenant Organization Switcher */}
        {organizations.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              aria-controls="org-switcher-dropdown"
              aria-label="Switch organization"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium border border-border/80 hover:bg-accent hover:text-accent-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Switch Organization
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </button>
            
            {isDropdownOpen && (
              <div
                id="org-switcher-dropdown"
                role="listbox"
                aria-label="Organizations list"
                className="absolute right-0 mt-1 w-56 origin-top-right rounded-lg border border-border bg-card shadow-lg p-1 z-50 transition-all duration-150"
              >
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    role="option"
                    aria-selected={org.id === activeOrganizationId}
                    onClick={() => handleOrgSelect(org.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:bg-accent ${
                      org.id === activeOrganizationId
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{org.name}</span>
                    <span className="text-[10px] uppercase text-muted-foreground opacity-60 tracking-wider">
                      {org.subdomain}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <NotificationBell />

        {/* Separator */}
        <div className="h-6 w-[1px] bg-border/55" aria-hidden="true" />

        {/* User profile dropdown trigger */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-xs font-semibold leading-none">
              {user ? `${user.firstName} ${user.lastName}` : 'CRM User'}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5 tracking-wider">
              {user ? user.role : 'Member'}
            </span>
          </div>

          <div 
            className="h-9 w-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shadow-inner"
            aria-label={user ? `${user.firstName} ${user.lastName} profile avatar` : 'Guest avatar'}
          >
            {user ? `${user.firstName[0]}${user.lastName[0]}` : <User className="h-4 w-4" aria-hidden="true" />}
          </div>

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            aria-label="Sign out"
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-border/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
