"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const SESSION_KEY = "pagereal-demo-session-v1";

type AuthMode = "demo" | "real" | null;

type AuthState = {
  loading: boolean;
  signedIn: boolean;
  mode: AuthMode;
  email: string | null;
  signInDemo: () => void;
  signInReal: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpReal: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false as const, error: data.error ?? "Something went wrong." };
  return { ok: true as const, data };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [mode, setMode] = useState<AuthMode>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      // A real session always wins over a stale demo flag — otherwise once
      // someone has ever tried the demo, the leftover localStorage flag
      // would shadow any real account on every later visit in that browser.
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          setSignedIn(true);
          setMode("real");
          setEmail(data.user.email);
          setLoading(false);
          return;
        }
      } catch {
        // no backend reachable yet — fall through to checking demo mode
      }
      if (localStorage.getItem(SESSION_KEY) === "1") {
        setSignedIn(true);
        setMode("demo");
      }
      setLoading(false);
    }
    check();
  }, []);

  function signInDemo() {
    localStorage.setItem(SESSION_KEY, "1");
    setSignedIn(true);
    setMode("demo");
  }

  async function signInReal(emailInput: string, password: string) {
    const result = await postJson("/api/auth/login", { email: emailInput, password });
    if (result.ok) {
      localStorage.removeItem(SESSION_KEY);
      setSignedIn(true);
      setMode("real");
      setEmail(result.data.email);
    }
    return result;
  }

  async function signUpReal(emailInput: string, password: string) {
    const result = await postJson("/api/auth/signup", { email: emailInput, password });
    if (result.ok) {
      localStorage.removeItem(SESSION_KEY);
      setSignedIn(true);
      setMode("real");
      setEmail(result.data.email);
    }
    return result;
  }

  async function signOut() {
    localStorage.removeItem(SESSION_KEY);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setSignedIn(false);
    setMode(null);
    setEmail(null);
  }

  return (
    <AuthContext.Provider value={{ loading, signedIn, mode, email, signInDemo, signInReal, signUpReal, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
