import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getAuthApp, isFirebaseConfigured } from '../firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(isFirebaseConfigured));

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const auth = getAuthApp();
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const signInWithEmailPassword = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured) return;
    await signInWithEmailAndPassword(getAuthApp(), email.trim(), password);
  }, []);

  const signOutUser = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    await signOut(getAuthApp());
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithEmailPassword,
      signOutUser,
    }),
    [user, loading, signInWithEmailPassword, signOutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth は AuthProvider 内で使ってください。');
  }
  return ctx;
}
