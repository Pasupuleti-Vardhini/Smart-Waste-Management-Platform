import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, ManagementUser, Facility, Company, UserRole } from '@/types';

interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  managementUser: ManagementUser | null;
  facility: Facility | null;
  company: Company | null;
  loading: boolean;
  isHousehold: boolean;
  isManagement: boolean;
  isAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    managementUser: null,
    facility: null,
    company: null,
    loading: true,
    isHousehold: false,
    isManagement: false,
    isAdmin: false,
  });

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setState({
          user: { id: userId, email: '' },
          profile: null,
          managementUser: null,
          facility: null,
          company: null,
          loading: false,
          isHousehold: false,
          isManagement: false,
          isAdmin: false,
        });
        return;
      }

      const role: UserRole = profile.role;
      let managementUser: ManagementUser | null = null;
      let facility: Facility | null = null;
      let company: Company | null = null;

      if (role === 'management' || role === 'admin') {
        const { data: mu, error: muError } = await supabase
          .from('management_users')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (muError) throw muError;
        managementUser = mu as ManagementUser | null;

        if (mu?.facility_id) {
          const { data: fac } = await supabase
            .from('facilities')
            .select('*')
            .eq('id', mu.facility_id)
            .maybeSingle();
          facility = fac as Facility | null;
        }

        if (mu?.company_id) {
          const { data: comp } = await supabase
            .from('companies')
            .select('*')
            .eq('id', mu.company_id)
            .maybeSingle();
          company = comp as Company | null;
        }
      }

      const hasActiveMgmt = !!managementUser;

      setState({
        user: { id: userId, email: profile.email },
        profile: profile as Profile,
        managementUser,
        facility,
        company,
        loading: false,
        isHousehold: role === 'household',
        isManagement: hasActiveMgmt && (role === 'management' || role === 'admin'),
        isAdmin: hasActiveMgmt && role === 'admin',
      });
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        isHousehold: false,
        isManagement: false,
        isAdmin: false,
      }));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        loadUserData(data.session.user.id);
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        setState({
          user: null,
          profile: null,
          managementUser: null,
          facility: null,
          company: null,
          loading: false,
          isHousehold: false,
          isManagement: false,
          isAdmin: false,
        });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setState((s) => ({ ...s, loading: true }));
        Promise.resolve().then(() => loadUserData(session.user.id));
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await loadUserData(state.user.id);
    }
  }, [state.user, loadUserData]);

  return (
    <AuthContext.Provider value={{ ...state, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
