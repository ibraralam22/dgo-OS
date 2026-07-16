import {
  LayoutDashboard,
  Users,
  UserCog,
  Briefcase,
  HelpCircle,
  Settings,
  ShieldAlert,
  CreditCard,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  allowedRoles?: string[];
}

export const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Leads',
    path: '/dashboard/leads',
    icon: Users,
    requiredPermissions: ['leads:read'],
  },
  {
    label: 'Clients & Contacts',
    path: '/dashboard/clients',
    icon: Users,
    requiredPermissions: ['clients:read'],
  },
  {
    label: 'Deals & Quotes',
    path: '/dashboard/opportunities',
    icon: Briefcase,
    requiredPermissions: ['opportunities:read'],
  },
  {
    label: 'Project Pods',
    path: '/dashboard/projects',
    icon: Briefcase,
    requiredPermissions: ['projects:read'],
  },
  {
    label: 'Financials & Invoices',
    path: '/dashboard/billing',
    icon: CreditCard,
    requiredPermissions: ['billing:read'],
  },
  {
    label: 'Service Desk',
    path: '/dashboard/tickets',
    icon: HelpCircle,
    requiredPermissions: ['tickets:read'],
  },
  {
    label: 'User Directory',
    path: '/dashboard/admin/users',
    icon: UserCog,
    requiredPermissions: ['iam:read'],
  },
  {
    label: 'Audit Security',
    path: '/dashboard/security',
    icon: ShieldAlert,
    allowedRoles: ['SuperAdmin', 'TenantAdmin'],
  },
  {
    label: 'Global Settings',
    path: '/dashboard/settings',
    icon: Settings,
    allowedRoles: ['SuperAdmin', 'TenantAdmin'],
  },
];
