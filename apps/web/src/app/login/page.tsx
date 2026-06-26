"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";

function LoginCard() {
  const { signInDemo, signInReal, signUpReal } = useAuth();
  const router = useRouter();

  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function continueAsDemo(e: React.FormEvent) {
    e.preventDefault();
    signInDemo();
    router.push("/app/dashboard");
  }

  async function submitRealAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = authTab === "signin" ? await signInReal(email, password) : await signUpReal(email, password);
    setSubmitting(false);
    if (result.ok) {
      router.push("/app/dashboard");
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            P
          </div>
          <span className="text-lg font-semibold text-slate-900">PageReal</span>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setAuthTab("signin")}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              authTab === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setAuthTab("signup")}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              authTab === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Create account
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">Verify your own numbers. Independently.</p>

        <form className="space-y-3" onSubmit={submitRealAuth}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@creator.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={authTab === "signin" ? "current-password" : "new-password"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            {authTab === "signup" && (
              <p className="mt-1 text-xs text-slate-400">At least 10 characters, with a letter and a number.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? "Please wait…" : authTab === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-2 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          or
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          onClick={continueAsDemo}
          className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          Continue with Demo Account
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">
          No real account needed — explore PageReal with seeded sample data.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginCard />
    </AuthProvider>
  );
}
