"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DemoStoreProvider } from "@/lib/store";
import { Sidebar } from "@/components/Sidebar";

function Gate({ children }: { children: React.ReactNode }) {
  const { loading, signedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/login");
  }, [loading, signedIn, router]);

  if (loading || !signedIn) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DemoStoreProvider>
        <Gate>{children}</Gate>
      </DemoStoreProvider>
    </AuthProvider>
  );
}
