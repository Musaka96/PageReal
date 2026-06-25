"use client";

import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";

function LoginCard() {
  const { signIn } = useAuth();
  const router = useRouter();

  function continueAsDemo(e: React.FormEvent) {
    e.preventDefault();
    signIn();
    router.push("/app/dashboard");
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
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Verify your own numbers. Independently.</p>

        <form className="mt-6 space-y-3" onSubmit={continueAsDemo}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              placeholder="you@creator.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <button
            type="button"
            disabled
            title="Real sign-in isn't wired up yet — use the demo account below"
            className="w-full cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-400"
          >
            Sign in
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
