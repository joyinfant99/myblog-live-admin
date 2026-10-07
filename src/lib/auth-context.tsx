'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

type AdminUser = { uid: string; email: string | null; isAdmin: boolean };
type Ctx = { user: AdminUser | null; loading: boolean; logout: () => Promise<void>; getIdToken: () => Promise<string | null> };

const AuthContext = createContext<Ctx>({ user: null, loading: true, logout: async () => {}, getIdToken: async () => null });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fu) => {
      if (fu) {
        const t = await fu.getIdTokenResult();
        setUser({ uid: fu.uid, email: fu.email, isAdmin: t.claims.admin === true });
      } else setUser(null);
      setLoading(false);
    });
  }, []);

  const logout = useCallback(async () => { await signOut(auth); setUser(null); }, []);
  const getIdToken = useCallback(async () => (auth.currentUser ? auth.currentUser.getIdToken(true) : null), []);
  const value = useMemo(() => ({ user, loading, logout, getIdToken }), [user, loading, logout, getIdToken]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
