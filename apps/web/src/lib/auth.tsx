"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const SESSION_KEY = "pagereal-demo-session-v1";

type AuthState = {
  loading: boolean;
  signedIn: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read on mount only, client-side — avoids SSR/hydration mismatch from
    // reading localStorage during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSignedIn(localStorage.getItem(SESSION_KEY) === "1");
    setLoading(false);
  }, []);

  function signIn() {
    localStorage.setItem(SESSION_KEY, "1");
    setSignedIn(true);
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    setSignedIn(false);
  }

  return <AuthContext.Provider value={{ loading, signedIn, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
