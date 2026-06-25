import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-base font-bold text-white">
        P
      </div>
      <h1 className="text-3xl font-semibold text-slate-900">PageReal</h1>
      <p className="mt-2 max-w-md text-slate-600">
        Know your own numbers. Independent earnings verification for OnlyFans/Fansly creators.
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700"
      >
        Try the demo
      </Link>
    </main>
  );
}
