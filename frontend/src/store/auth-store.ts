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

/** Set a lightweight cookie readable by Next.js Edge Middleware. */
function setAuthCookie() {
  if (typeof document === 'undefined') return;
  // SameSite=Lax, no HttpOnly (must be readable by middleware without secret)
  document.cookie = 'auth_present=1; path=/; SameSite=Lax; max-age=86400';
}

/** Clear the auth presence cookie on logout. */
function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = 'auth_present=; path=/; SameSite=Lax; max-age=0';
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
        const defaultOrgId = orgs.length > 0 ? orgs[0].id : null;
        set({
          user,
          accessToken: token,
          organizations: orgs,
          activeOrganizationId: defaultOrgId,
          isAuthenticated: true,
        });
        // Signal to Edge Middleware that a session is active
        setAuthCookie();
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          activeOrganizationId: null,
          organizations: [],
          isAuthenticated: false,
        });
        // Remove the middleware signal cookie
        clearAuthCookie();
      },

      setActiveOrganizationId: (orgId) => {
        set({ activeOrganizationId: orgId });
      },
    }),
    {
      name: 'dgo_auth_session', // Key in localStorage
    },
  ),
);
