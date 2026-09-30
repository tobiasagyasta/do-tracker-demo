"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";

import { createDemoStore, type DemoStore } from "@/stores/demo-store";

type DemoStoreApi = ReturnType<typeof createDemoStore>;

const DemoStoreContext = createContext<DemoStoreApi | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createDemoStore);

  useEffect(() => {
    void store.persist.rehydrate();

    function handleStorage(event: StorageEvent) {
      if (event.key === store.persist.getOptions().name) {
        void store.persist.rehydrate();
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, [store]);

  return (
    <DemoStoreContext.Provider value={store}>
      {children}
    </DemoStoreContext.Provider>
  );
}

export function useDemoStore<T>(selector: (state: DemoStore) => T): T {
  const store = useContext(DemoStoreContext);

  if (!store) {
    throw new Error("useDemoStore must be used within DemoStoreProvider");
  }

  return useStore(store, selector);
}
