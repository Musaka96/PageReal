import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">ClearLedger</h1>
      <p className="mt-2 max-w-md text-slate-600">
        Know your own numbers. Independent earnings verification for OnlyFans/Fansly creators.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700"
      >
        View demo dashboard
      </Link>
    </main>
  );
}
