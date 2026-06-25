"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { demoContracts, demoPayments, demoSnapshots } from "./demo-data";
import type { ContractVersion, LoggedPayment, Snapshot } from "./types";

const STORAGE_KEY = "pagereal-demo-store-v1";

type DemoState = {
  snapshots: Snapshot[];
  contracts: ContractVersion[];
  payments: LoggedPayment[];
};

type DemoStore = DemoState & {
  updateContract: (index: number, patch: Partial<ContractVersion>) => void;
  addPayment: (payment: LoggedPayment) => void;
  removePayment: (index: number) => void;
  resetDemo: () => void;
};

function defaultState(): DemoState {
  return {
    snapshots: demoSnapshots,
    contracts: demoContracts,
    payments: demoPayments,
  };
}

const DemoStoreContext = createContext<DemoStore | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read on mount only, client-side — avoids SSR/hydration mismatch from
    // reading localStorage during render.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(JSON.parse(raw) as DemoState);
      } catch {
        // ignore corrupt local storage, fall back to defaults
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const store = useMemo<DemoStore>(
    () => ({
      ...state,
      updateContract(index, patch) {
        setState((prev) => ({
          ...prev,
          contracts: prev.contracts.map((c, i) => (i === index ? { ...c, ...patch } : c)),
        }));
      },
      addPayment(payment) {
        setState((prev) => ({ ...prev, payments: [...prev.payments, payment] }));
      },
      removePayment(index) {
        setState((prev) => ({ ...prev, payments: prev.payments.filter((_, i) => i !== index) }));
      },
      resetDemo() {
        setState(defaultState());
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [state]
  );

  return <DemoStoreContext.Provider value={store}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore(): DemoStore {
  const ctx = useContext(DemoStoreContext);
  if (!ctx) throw new Error("useDemoStore must be used within a DemoStoreProvider");
  return ctx;
}
