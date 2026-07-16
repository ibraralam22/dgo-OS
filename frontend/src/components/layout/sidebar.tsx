'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/auth-store';
import { navigationItems } from '../../utils/navigation-config';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Dynamic filter displaying navitems matching active user permissions and roles
  const filteredNavigation = navigationItems.filter((item) => {
    if (!user) {
      return false;
    }

    const hasAllowedRole =
      !item.allowedRoles || item.allowedRoles.includes(user.role);

    const hasRequiredPermission =
      !item.requiredPermissions ||
      item.requiredPermissions.every((perm) => user.permissions.includes(perm));

    return hasAllowedRole && hasRequiredPermission;
  });

  return (
    <aside
      className={`relative h-screen bg-card border-r border-border transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-border/40 select-none">
        <div className="h-9 w-9 min-w-[36px] rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm tracking-wider shadow shadow-primary/20">
          DGO
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-none uppercase tracking-widest text-foreground">
              DGO CRM
            </span>
            <span className="text-[9px] text-muted-foreground font-medium mt-0.5 tracking-wider">
              ENTERPRISE PLATFORM
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-primary pl-2.5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform ${isActive ? 'text-primary' : 'group-hover:scale-105'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapsed Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute bottom-6 -right-3 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground shadow hover:bg-accent transition-colors z-50 cursor-pointer"
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
