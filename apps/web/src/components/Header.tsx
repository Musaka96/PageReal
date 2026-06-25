import Link from "next/link";

export function Header({ active }: { active: "dashboard" | "audit-log" }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">Demo Creator</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          {active === "dashboard" ? "Earnings Reconciliation" : "Audit Log"}
        </h1>
      </div>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        Demo Mode — synthetic data
      </span>
    </div>
  );
}

export function Nav({ active }: { active: "dashboard" | "audit-log" }) {
  const tabs = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/audit-log", label: "Audit Log", key: "audit-log" },
  ] as const;
  return (
    <nav className="mb-6 flex gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            active === tab.key
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
