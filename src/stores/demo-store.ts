import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";

import { mockDeliveryOrders } from "@/data/mock-delivery-orders";
import { mockPartners } from "@/data/mock-partners";
import {
  createDeliveryOrderFromInput,
  generateNextDeliveryOrderNumber,
} from "@/lib/delivery-order-creation";
import {
  legacyDeliveryOrderToSalesInvoice,
  legacyDeliveryOrderToTransaction,
} from "@/lib/invoice";
import { createPartnerFromInput, type CreatePartnerInput } from "@/lib/partners";
import type {
  CreateDeliveryOrderInput,
  DeliveryOrder,
  DeliveryOrderTransaction,
  SalesInvoice,
} from "@/types/delivery-order";
import type { Partner } from "@/types/partner";

export const DEMO_STORE_STORAGE_KEY = "do-tracker-demo-store";
export const DEMO_STORE_VERSION = 1;

export type UpdateResult<T> =
  | { ok: true; record: T }
  | { ok: false; reason: "not-found" };

export interface DemoStoreState {
  deliveryOrders: DeliveryOrder[];
  deliveryOrderTransactions: DeliveryOrderTransaction[];
  salesInvoices: SalesInvoice[];
  partners: Partner[];
  deliveryOrderDraft?: CreateDeliveryOrderInput;
  lastCreatedDeliveryOrderId?: string;
  hasHydrated: boolean;
}

export interface DemoStoreActions {
  createDeliveryOrder: (input: CreateDeliveryOrderInput) => DeliveryOrder;
  updateDeliveryOrder: (
    id: string,
    updates: Partial<DeliveryOrder>,
  ) => UpdateResult<DeliveryOrder>;
  createPartner: (input: CreatePartnerInput) => Partner;
  updatePartner: (id: string, updates: Partial<Partner>) => UpdateResult<Partner>;
  saveDeliveryOrderDraft: (draft: CreateDeliveryOrderInput) => void;
  clearDeliveryOrderDraft: () => void;
  resetDemoData: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export type DemoStore = DemoStoreState & DemoStoreActions;

function cloneSeedDeliveryOrders(): DeliveryOrder[] {
  return mockDeliveryOrders.map((order) => ({ ...order }));
}

function cloneSeedDeliveryOrderTransactions(): DeliveryOrderTransaction[] {
  return cloneSeedDeliveryOrders().map(legacyDeliveryOrderToTransaction);
}

function cloneSeedSalesInvoices(): SalesInvoice[] {
  return cloneSeedDeliveryOrders().flatMap((order) => {
    const invoice = legacyDeliveryOrderToSalesInvoice(order);
    return invoice ? [invoice] : [];
  });
}

function cloneSeedPartners(): Partner[] {
  return mockPartners.map((partner) => ({ ...partner }));
}

function getSeedState(): DemoStoreState {
  return {
    deliveryOrders: cloneSeedDeliveryOrders(),
    deliveryOrderTransactions: cloneSeedDeliveryOrderTransactions(),
    salesInvoices: cloneSeedSalesInvoices(),
    partners: cloneSeedPartners(),
    deliveryOrderDraft: undefined,
    lastCreatedDeliveryOrderId: undefined,
    hasHydrated: false,
  };
}

function isDeliveryOrderArray(value: unknown): value is DeliveryOrder[] {
  return Array.isArray(value) && value.every((order) => {
    if (!order || typeof order !== "object") {
      return false;
    }

    const candidate = order as Partial<DeliveryOrder>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.doNumber === "string" &&
      typeof candidate.status === "string"
    );
  });
}

function isDeliveryOrderTransactionArray(
  value: unknown,
): value is DeliveryOrderTransaction[] {
  return Array.isArray(value) && value.every((transaction) => {
    if (!transaction || typeof transaction !== "object") {
      return false;
    }

    const candidate = transaction as Partial<DeliveryOrderTransaction>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.deliveryOrderId === "string" &&
      typeof candidate.transactionNumber === "string"
    );
  });
}

function isSalesInvoiceArray(value: unknown): value is SalesInvoice[] {
  return Array.isArray(value) && value.every((invoice) => {
    if (!invoice || typeof invoice !== "object") {
      return false;
    }

    const candidate = invoice as Partial<SalesInvoice>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.invoiceNumber === "string" &&
      Array.isArray(candidate.transactionIds) &&
      Array.isArray(candidate.lines)
    );
  });
}

function isPartnerArray(value: unknown): value is Partner[] {
  return Array.isArray(value) && value.every((partner) => {
    if (!partner || typeof partner !== "object") {
      return false;
    }

    const candidate = partner as Partial<Partner>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.code === "string" &&
      typeof candidate.name === "string"
    );
  });
}

function normalizePersistedState(persistedState: unknown): Partial<DemoStoreState> {
  if (!persistedState || typeof persistedState !== "object") {
    return getSeedState();
  }

  const candidate = persistedState as Partial<DemoStoreState>;
  const seed = getSeedState();
  const deliveryOrders = isDeliveryOrderArray(candidate.deliveryOrders)
    ? candidate.deliveryOrders
    : seed.deliveryOrders;

  return {
    deliveryOrders,
    deliveryOrderTransactions: isDeliveryOrderTransactionArray(
      candidate.deliveryOrderTransactions,
    )
      ? candidate.deliveryOrderTransactions
      : deliveryOrders.map(legacyDeliveryOrderToTransaction),
    salesInvoices: isSalesInvoiceArray(candidate.salesInvoices)
      ? candidate.salesInvoices
      : deliveryOrders.flatMap((order) => {
          const invoice = legacyDeliveryOrderToSalesInvoice(order);
          return invoice ? [invoice] : [];
        }),
    partners: isPartnerArray(candidate.partners) ? candidate.partners : seed.partners,
    deliveryOrderDraft: candidate.deliveryOrderDraft,
    lastCreatedDeliveryOrderId:
      typeof candidate.lastCreatedDeliveryOrderId === "string"
        ? candidate.lastCreatedDeliveryOrderId
        : undefined,
    hasHydrated: false,
  };
}

export function createDemoStore() {
  return createStore<DemoStore>()(
    persist(
      (set, get) => ({
        ...getSeedState(),
        createDeliveryOrder: (input) => {
          const doNumber =
            input.doNumber || generateNextDeliveryOrderNumber(get().deliveryOrders);
          const order = createDeliveryOrderFromInput({
            ...input,
            doNumber,
          });

          set((state) => ({
            deliveryOrders: [order, ...state.deliveryOrders],
            deliveryOrderTransactions: [
              legacyDeliveryOrderToTransaction(order),
              ...state.deliveryOrderTransactions,
            ],
            lastCreatedDeliveryOrderId: order.id,
          }));

          return order;
        },
        updateDeliveryOrder: (id, updates) => {
          const existing = get().deliveryOrders.find((order) => order.id === id);

          if (!existing) {
            return { ok: false, reason: "not-found" };
          }

          const updated = { ...existing, ...updates };
          const updatedTransaction = legacyDeliveryOrderToTransaction(updated);
          const updatedInvoice = legacyDeliveryOrderToSalesInvoice(updated);

          set((state) => ({
            deliveryOrders: state.deliveryOrders.map((order) =>
              order.id === id ? updated : order,
            ),
            deliveryOrderTransactions: state.deliveryOrderTransactions.map(
              (transaction) =>
                transaction.id === id ? updatedTransaction : transaction,
            ),
            salesInvoices: updatedInvoice
              ? [
                  updatedInvoice,
                  ...state.salesInvoices.filter(
                    (invoice) => invoice.id !== updatedInvoice.id,
                  ),
                ]
              : state.salesInvoices.filter((invoice) => invoice.id !== existing.salesInvoiceNumber),
          }));

          return { ok: true, record: updated };
        },
        createPartner: (input) => {
          const partner = createPartnerFromInput(get().partners, input);

          set((state) => ({ partners: [partner, ...state.partners] }));

          return partner;
        },
        updatePartner: (id, updates) => {
          const existing = get().partners.find((partner) => partner.id === id);

          if (!existing) {
            return { ok: false, reason: "not-found" };
          }

          const updated = { ...existing, ...updates };
          set((state) => ({
            partners: state.partners.map((partner) =>
              partner.id === id ? updated : partner,
            ),
          }));

          return { ok: true, record: updated };
        },
        saveDeliveryOrderDraft: (draft) => set({ deliveryOrderDraft: draft }),
        clearDeliveryOrderDraft: () => set({ deliveryOrderDraft: undefined }),
        resetDemoData: () => set(getSeedState()),
        setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      }),
      {
        name: DEMO_STORE_STORAGE_KEY,
        version: DEMO_STORE_VERSION,
        storage: createJSONStorage(() => localStorage),
        skipHydration: true,
        partialize: (state) => ({
          deliveryOrders: state.deliveryOrders,
          deliveryOrderTransactions: state.deliveryOrderTransactions,
          salesInvoices: state.salesInvoices,
          partners: state.partners,
          deliveryOrderDraft: state.deliveryOrderDraft,
          lastCreatedDeliveryOrderId: state.lastCreatedDeliveryOrderId,
        }),
        migrate: (persistedState) => normalizePersistedState(persistedState),
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...normalizePersistedState(persistedState),
          hasHydrated: false,
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            state?.resetDemoData();
          }

          state?.setHasHydrated(true);
        },
      },
    ),
  );
}

export const selectHasHydrated = (state: DemoStore) => state.hasHydrated;
export const selectDeliveryOrders = (state: DemoStore) => state.deliveryOrders;
export const selectPartners = (state: DemoStore) => state.partners;
export const selectCreatePartner = (state: DemoStore) => state.createPartner;
export const selectUpdateDeliveryOrder = (state: DemoStore) =>
  state.updateDeliveryOrder;
export const selectResetDemoData = (state: DemoStore) => state.resetDemoData;
