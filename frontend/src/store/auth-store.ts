import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}

export interface OrganizationInfo {
  id: string;
  name: string;
  subdomain: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  activeOrganizationId: string | null;
  organizations: OrganizationInfo[];
  isAuthenticated: boolean;
  
  // Actions
  login: (user: UserProfile, token: string, orgs: OrganizationInfo[]) => void;
  logout: () => void;
  setActiveOrganizationId: (orgId: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      activeOrganizationId: null,
      organizations: [],
      isAuthenticated: false,

      login: (user, token, orgs) => {
        // Automatically default active tenant selection to the first organization registered if present
        const defaultOrgId = orgs.length > 0 ? orgs[0].id : null;
        set({
          user,
          accessToken: token,
          organizations: orgs,
          activeOrganizationId: defaultOrgId,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          activeOrganizationId: null,
          organizations: [],
          isAuthenticated: false,
        });
      },

      setActiveOrganizationId: (orgId) => {
        set({ activeOrganizationId: orgId });
      },
    }),
    {
      name: 'dgo_auth_session', // Key name in localStorage
    },
  ),
);
