import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";

import { mockDeliveryOrders } from "@/data/mock-delivery-orders";
import { mockPartners } from "@/data/mock-partners";
import {
  createDeliveryOrderFromInput,
  generateNextDeliveryOrderNumber,
} from "@/lib/delivery-order-creation";
import {
  INVOICE_PPH23_RATE,
  createInvoiceLineSnapshot,
  legacyDeliveryOrderToSalesInvoice,
  legacyDeliveryOrderToTransaction,
  validateInvoiceSelection,
} from "@/lib/invoice";
import { createPartnerFromInput, type CreatePartnerInput } from "@/lib/partners";
import type {
  CreateDeliveryOrderInput,
  CreateDeliveryOrderTransactionInput,
  CreateDeliveryOrderWithTransactionsInput,
  CreateParentDeliveryOrderInput,
  DeliveryOrderFormDraft,
  DeliveryOrder,
  DeliveryOrderTransaction,
  InvoiceDraft,
  IssueSalesInvoiceInput,
  SalesInvoice,
} from "@/types/delivery-order";
import type { Partner } from "@/types/partner";

export const DEMO_STORE_STORAGE_KEY = "do-tracker-demo-store";
export const DEMO_STORE_VERSION = 2;

export type UpdateResult<T> =
  | { ok: true; record: T }
  | { ok: false; reason: "not-found" };

export type StoreActionResult<T> =
  | { ok: true; record: T }
  | { ok: false; reason: string; errors?: string[] };

export interface DemoStoreState {
  deliveryOrders: DeliveryOrder[];
  deliveryOrderTransactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
  partners: Partner[];
  deliveryOrderDraft?: DeliveryOrderFormDraft;
  invoiceDraft?: InvoiceDraft;
  lastCreatedDeliveryOrderId?: string;
  hasHydrated: boolean;
}

export interface DemoStoreActions {
  createDeliveryOrder: (input: CreateDeliveryOrderInput) => DeliveryOrder;
  createParentDeliveryOrder: (
    input: CreateParentDeliveryOrderInput,
  ) => StoreActionResult<DeliveryOrder>;
  createDeliveryOrderWithTransactions: (
    input: CreateDeliveryOrderWithTransactionsInput,
  ) => StoreActionResult<DeliveryOrder>;
  updateDeliveryOrder: (
    id: string,
    updates: Partial<DeliveryOrder>,
  ) => UpdateResult<DeliveryOrder>;
  createDeliveryOrderTransaction: (
    input: CreateDeliveryOrderTransactionInput,
  ) => StoreActionResult<DeliveryOrderTransaction>;
  updateDeliveryOrderTransaction: (
    id: string,
    updates: Partial<DeliveryOrderTransaction>,
  ) => StoreActionResult<DeliveryOrderTransaction>;
  removeDeliveryOrderTransaction: (id: string) => StoreActionResult<DeliveryOrderTransaction>;
  createInvoiceDraft: (draft: InvoiceDraft) => StoreActionResult<InvoiceDraft>;
  issueInvoice: (input: IssueSalesInvoiceInput) => StoreActionResult<SalesInvoice>;
  cancelInvoice: (id: string) => StoreActionResult<SalesInvoice>;
  markInvoicePaid: (id: string, paymentDate: string) => StoreActionResult<SalesInvoice>;
  createPartner: (input: CreatePartnerInput) => Partner;
  updatePartner: (id: string, updates: Partial<Partner>) => UpdateResult<Partner>;
  saveDeliveryOrderDraft: (draft: DeliveryOrderFormDraft) => void;
  clearDeliveryOrderDraft: () => void;
  clearInvoiceDraft: () => void;
  resetDemoData: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export type DemoStore = DemoStoreState & DemoStoreActions;

type LegacyPersistedState = Partial<DemoStoreState> & {
  salesInvoices?: SalesInvoice[];
};

function cloneSeedDeliveryOrders(): DeliveryOrder[] {
  return mockDeliveryOrders.map((order) => ({ ...order }));
}

function cloneSeedDeliveryOrderTransactions(): DeliveryOrderTransaction[] {
  const transactions = cloneSeedDeliveryOrders().map(legacyDeliveryOrderToTransaction);
  const examples = createMultiTransactionInvoiceExamples(cloneSeedDeliveryOrders());
  const replacedParentIds = new Set(examples.transactions.map((transaction) => transaction.deliveryOrderId));

  return [
    ...examples.transactions,
    ...transactions.filter((transaction) => !replacedParentIds.has(transaction.deliveryOrderId)),
  ];
}

function cloneSeedInvoices(): SalesInvoice[] {
  const orders = cloneSeedDeliveryOrders();
  const examples = createMultiTransactionInvoiceExamples(orders);
  const replacedParentIds = new Set(examples.transactions.map((transaction) => transaction.deliveryOrderId));

  return [
    ...examples.invoices,
    ...orders.filter((order) => !replacedParentIds.has(order.id)).flatMap((order) => {
    const invoice = legacyDeliveryOrderToSalesInvoice(order);
    return invoice ? [invoice] : [];
    }),
  ];
}

function cloneSeedPartners(): Partner[] {
  return mockPartners.map((partner) => ({ ...partner }));
}

function createMultiTransactionInvoiceExamples(orders: DeliveryOrder[]): {
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
} {
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const examples = [
    {
      parentId: "do-001",
      invoiceId: "INV-SLS-2609-M001",
      invoiceDate: "2026-09-08",
      paymentDate: "2026-09-18",
      transactions: [
        { id: "trx-do-001-01", transactionNumber: "SPB-2609-001A", truckPlate: "B 9142 UYX", driverName: "Agus Santoso", tonnage: 31.8, loadingDate: "2026-09-01", unloadingDate: "2026-09-02" },
        { id: "trx-do-001-02", transactionNumber: "SPB-2609-001B", truckPlate: "B 9031 UYR", driverName: "Maman Firmansyah", tonnage: 29.4, loadingDate: "2026-09-01", unloadingDate: "2026-09-02" },
        { id: "trx-do-001-03", transactionNumber: "SPB-2609-001C", truckPlate: "B 8872 UZA", driverName: "Rizal Pratama", tonnage: 30.6, loadingDate: "2026-09-02", unloadingDate: "2026-09-03" },
      ],
    },
    {
      parentId: "do-002",
      invoiceId: "INV-SLS-2609-M002",
      invoiceDate: "2026-09-10",
      transactions: [
        { id: "trx-do-002-01", transactionNumber: "SPB-2609-002A", truckPlate: "KT 8721 BN", driverName: "Rudi Hartono", tonnage: 29.5, loadingDate: "2026-09-03", unloadingDate: "2026-09-04" },
        { id: "trx-do-002-02", transactionNumber: "SPB-2609-002B", truckPlate: "KT 9014 BP", driverName: "Ahmad Fauzan", tonnage: 28.7, loadingDate: "2026-09-04", unloadingDate: "2026-09-05" },
      ],
    },
  ];

  const transactions = examples.flatMap((example) => {
    const order = ordersById.get(example.parentId);
    if (!order) return [];

    return example.transactions.map((transaction) => ({
      ...legacyDeliveryOrderToTransaction(order),
      ...transaction,
      deliveryOrderId: order.id,
      salesInvoiceId: example.invoiceId,
    }));
  });
  const invoices = examples.flatMap((example) => {
    const order = ordersById.get(example.parentId);
    if (!order) return [];

    const invoiceTransactions = transactions.filter(
      (transaction) => transaction.deliveryOrderId === order.id,
    );

    return [{
      id: example.invoiceId,
      invoiceNumber: example.invoiceId,
      invoiceDate: example.invoiceDate,
      customerName: order.customerName,
      customerBillingDetails: { name: order.customerName },
      transactionIds: invoiceTransactions.map((transaction) => transaction.id),
      status: example.paymentDate ? "PAID" : "ISSUED",
      paymentDate: example.paymentDate,
      pph23Rate: INVOICE_PPH23_RATE,
      rentalDepositDeduction: 0,
      lines: invoiceTransactions.map((transaction) => createInvoiceLineSnapshot(transaction, order)),
    } satisfies SalesInvoice];
  });

  return { transactions, invoices };
}

function getSeedState(): DemoStoreState {
  return {
    deliveryOrders: cloneSeedDeliveryOrders(),
    deliveryOrderTransactions: cloneSeedDeliveryOrderTransactions(),
    invoices: cloneSeedInvoices(),
    partners: cloneSeedPartners(),
    deliveryOrderDraft: undefined,
    invoiceDraft: undefined,
    lastCreatedDeliveryOrderId: undefined,
    hasHydrated: false,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isDeliveryOrderArray(value: unknown): value is DeliveryOrder[] {
  return Array.isArray(value) && value.every((order) => {
    if (!isObject(order)) {
      return false;
    }

    return (
      isString(order.id) &&
      isString(order.doNumber) &&
      isString(order.customerName) &&
      isString(order.partnerName) &&
      isString(order.originMine) &&
      isString(order.destinationPort) &&
      isString(order.status)
    );
  });
}

function isDeliveryOrderTransactionArray(
  value: unknown,
): value is DeliveryOrderTransaction[] {
  return Array.isArray(value) && value.every((transaction) => {
    if (!isObject(transaction)) {
      return false;
    }

    return (
      isString(transaction.id) &&
      isString(transaction.deliveryOrderId) &&
      isString(transaction.transactionNumber) &&
      isString(transaction.truckPlate) &&
      isString(transaction.driverName) &&
      isString(transaction.loadingDate) &&
      isString(transaction.loadingLocation) &&
      isString(transaction.unloadingLocation) &&
      isNumber(transaction.tonnage) &&
      isNumber(transaction.salesRatePerTon) &&
      isNumber(transaction.roadMoney) &&
      isNumber(transaction.partnerRatePerTon) &&
      isNumber(transaction.gasMoney) &&
      isString(transaction.partnerPaymentStatus)
    );
  });
}

function isSalesInvoiceArray(value: unknown): value is SalesInvoice[] {
  return Array.isArray(value) && value.every((invoice) => {
    if (!isObject(invoice)) {
      return false;
    }

    return (
      isString(invoice.id) &&
      isString(invoice.invoiceNumber) &&
      isString(invoice.invoiceDate) &&
      isString(invoice.customerName) &&
      isObject(invoice.customerBillingDetails) &&
      Array.isArray(invoice.transactionIds) &&
      invoice.transactionIds.every(isString) &&
      isString(invoice.status) &&
      isNumber(invoice.pph23Rate) &&
      isNumber(invoice.rentalDepositDeduction) &&
      Array.isArray(invoice.lines)
    );
  });
}

function isPartnerArray(value: unknown): value is Partner[] {
  return Array.isArray(value) && value.every((partner) => {
    if (!isObject(partner)) {
      return false;
    }

    return isString(partner.id) && isString(partner.code) && isString(partner.name);
  });
}

function isDeliveryOrderDraft(value: unknown): value is DeliveryOrderFormDraft {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.customerName) &&
    isString(value.partnerId) &&
    isString(value.originMine) &&
    isString(value.destinationPort) &&
    isString(value.salesRatePerTon) &&
    isString(value.roadMoney) &&
    isString(value.partnerRatePerTon) &&
    isString(value.gasMoney) &&
    isString(value.updatedAt) &&
    Array.isArray(value.transactions) &&
    value.transactions.every((row) =>
      isObject(row) &&
      isString(row.clientId) &&
      isString(row.transactionNumber) &&
      isString(row.truckPlate) &&
      isString(row.driverName) &&
      isString(row.loadingDate) &&
      isString(row.unloadingDate) &&
      isString(row.loadingLocation) &&
      isString(row.unloadingLocation) &&
      isString(row.tonnage) &&
      isString(row.category) &&
      isString(row.salesRatePerTon) &&
      isString(row.roadMoney) &&
      isString(row.partnerRatePerTon) &&
      isString(row.gasMoney),
    )
  );
}

function isInvoiceDraft(value: unknown): value is InvoiceDraft {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.invoiceNumber) &&
    isString(value.invoiceDate) &&
    isObject(value.customerBillingDetails) &&
    Array.isArray(value.transactionIds) &&
    value.transactionIds.every(isString) &&
    isNumber(value.pph23Rate) &&
    isNumber(value.rentalDepositDeduction)
  );
}

function normalizeParentOrder(order: DeliveryOrder): DeliveryOrder {
  return {
    ...order,
    defaultRates: order.defaultRates ?? {
      salesRatePerTon: order.tonnage > 0 ? order.sellingPrice / order.tonnage : 0,
      roadMoney: order.salesGasMoney,
      partnerRatePerTon: order.tonnage > 0 ? order.transportPrice / order.tonnage : 0,
      gasMoney: order.gasMoney,
    },
    summary: undefined,
  };
}

function migrateLegacyState(candidate: LegacyPersistedState): Partial<DemoStoreState> {
  const seed = getSeedState();
  const deliveryOrders = isDeliveryOrderArray(candidate.deliveryOrders)
    ? candidate.deliveryOrders.map(normalizeParentOrder)
    : seed.deliveryOrders;
  const legacyInvoices = candidate.invoices ?? candidate.salesInvoices;
  const convertedInvoices = deliveryOrders.flatMap((order) => {
    const invoice = legacyDeliveryOrderToSalesInvoice(order);
    return invoice ? [invoice] : [];
  });
  const invoices = isSalesInvoiceArray(legacyInvoices) ? legacyInvoices : convertedInvoices;
  const invoiceIds = new Set(invoices.filter((invoice) => invoice.status !== "CANCELLED").map((invoice) => invoice.id));
  const deliveryOrderTransactions = isDeliveryOrderTransactionArray(
    candidate.deliveryOrderTransactions,
  )
    ? candidate.deliveryOrderTransactions.map((transaction) => ({
        ...transaction,
        salesInvoiceId: transaction.salesInvoiceId && invoiceIds.has(transaction.salesInvoiceId)
          ? transaction.salesInvoiceId
          : undefined,
      }))
    : deliveryOrders.map((order) => {
        const transaction = legacyDeliveryOrderToTransaction(order);
        return {
          ...transaction,
          salesInvoiceId: transaction.salesInvoiceId && invoiceIds.has(transaction.salesInvoiceId)
            ? transaction.salesInvoiceId
            : undefined,
        };
      });

  return {
    deliveryOrders,
    deliveryOrderTransactions,
    invoices,
    partners: isPartnerArray(candidate.partners) ? candidate.partners : seed.partners,
    deliveryOrderDraft: isDeliveryOrderDraft(candidate.deliveryOrderDraft)
      ? candidate.deliveryOrderDraft
      : undefined,
    invoiceDraft: isInvoiceDraft(candidate.invoiceDraft) ? candidate.invoiceDraft : undefined,
    lastCreatedDeliveryOrderId: isString(candidate.lastCreatedDeliveryOrderId)
      ? candidate.lastCreatedDeliveryOrderId
      : undefined,
    hasHydrated: false,
  };
}

function normalizePersistedState(persistedState: unknown): Partial<DemoStoreState> {
  if (!isObject(persistedState)) {
    return getSeedState();
  }

  return migrateLegacyState(persistedState as LegacyPersistedState);
}

function createParentFromLegacyInput(input: CreateDeliveryOrderInput): DeliveryOrder {
  const order = createDeliveryOrderFromInput(input);
  return normalizeParentOrder(order);
}

function createTransactionFromInput(
  input: CreateDeliveryOrderTransactionInput,
): DeliveryOrderTransaction {
  return {
    ...input,
    partnerPaymentStatus: input.partnerPaidAt ? "PAID" : "UNPAID",
  };
}

function createLegacyCompatibleOrder(input: CreateParentDeliveryOrderInput): DeliveryOrder {
  return {
    id: input.id,
    doNumber: input.doNumber,
    customerName: input.customerName,
    partnerName: input.partnerName,
    originMine: input.originMine,
    destinationPort: input.destinationPort,
    defaultRates: input.defaultRates,
    truckPlate: "",
    driverName: "",
    loadingDate: "",
    tonnage: 0,
    transportPrice: 0,
    roadMoney: input.defaultRates?.roadMoney ?? 0,
    gasMoney: input.defaultRates?.gasMoney ?? 0,
    partnerPph23: 0,
    purchaseTotal: 0,
    sellingPrice: 0,
    salesGasMoney: input.defaultRates?.roadMoney ?? 0,
    salesPph23: 0,
    salesTotal: 0,
    status: "UNPAID_PARTNER",
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
          const order = createParentFromLegacyInput({
            ...input,
            doNumber,
          });
          const transaction = legacyDeliveryOrderToTransaction(order);

          set((state) => ({
            deliveryOrders: [order, ...state.deliveryOrders],
            deliveryOrderTransactions: [transaction, ...state.deliveryOrderTransactions],
            lastCreatedDeliveryOrderId: order.id,
          }));

          return order;
        },
        createParentDeliveryOrder: (input) => {
          if (get().deliveryOrders.some((order) => order.id === input.id)) {
            return { ok: false, reason: "duplicate-id" };
          }

          const order = createLegacyCompatibleOrder(input);
          set((state) => ({
            deliveryOrders: [order, ...state.deliveryOrders],
            lastCreatedDeliveryOrderId: order.id,
          }));

          return { ok: true, record: order };
        },
        createDeliveryOrderWithTransactions: (input) => {
          const state = get();

          if (state.deliveryOrders.some((order) => order.id === input.parent.id)) {
            return { ok: false, reason: "duplicate-delivery-order-id" };
          }

          if (input.transactions.length === 0) {
            return { ok: false, reason: "missing-transactions" };
          }

          const transactionNumbers = input.transactions.map((transaction) =>
            transaction.transactionNumber.trim().toLocaleLowerCase("id-ID"),
          );
          const duplicateInForm = transactionNumbers.some(
            (number, index) => number === "" || transactionNumbers.indexOf(number) !== index,
          );

          if (duplicateInForm) {
            return { ok: false, reason: "duplicate-transaction-number" };
          }

          const existingTransactionNumbers = new Set(
            state.deliveryOrderTransactions.map((transaction) =>
              transaction.transactionNumber.trim().toLocaleLowerCase("id-ID"),
            ),
          );

          if (transactionNumbers.some((number) => existingTransactionNumbers.has(number))) {
            return { ok: false, reason: "duplicate-transaction-number" };
          }

          const order = createLegacyCompatibleOrder(input.parent);
          const transactions = input.transactions.map((transaction) =>
            createTransactionFromInput({
              ...transaction,
              deliveryOrderId: order.id,
            }),
          );

          set((currentState) => ({
            deliveryOrders: [order, ...currentState.deliveryOrders],
            deliveryOrderTransactions: [
              ...transactions,
              ...currentState.deliveryOrderTransactions,
            ],
            lastCreatedDeliveryOrderId: order.id,
          }));

          return { ok: true, record: order };
        },
        updateDeliveryOrder: (id, updates) => {
          const existing = get().deliveryOrders.find((order) => order.id === id);

          if (!existing) {
            return { ok: false, reason: "not-found" };
          }

          const updated = normalizeParentOrder({ ...existing, ...updates });

          set((state) => ({
            deliveryOrders: state.deliveryOrders.map((order) =>
              order.id === id ? updated : order,
            ),
          }));

          return { ok: true, record: updated };
        },
        createDeliveryOrderTransaction: (input) => {
          if (!get().deliveryOrders.some((order) => order.id === input.deliveryOrderId)) {
            return { ok: false, reason: "delivery-order-not-found" };
          }

          if (get().deliveryOrderTransactions.some((transaction) => transaction.id === input.id)) {
            return { ok: false, reason: "duplicate-id" };
          }

          const transaction = createTransactionFromInput(input);
          set((state) => ({
            deliveryOrderTransactions: [transaction, ...state.deliveryOrderTransactions],
          }));

          return { ok: true, record: transaction };
        },
        updateDeliveryOrderTransaction: (id, updates) => {
          const existing = get().deliveryOrderTransactions.find(
            (transaction) => transaction.id === id,
          );

          if (!existing) {
            return { ok: false, reason: "not-found" };
          }

          if (existing.salesInvoiceId && updates.salesInvoiceId !== existing.salesInvoiceId) {
            return { ok: false, reason: "invoiced-transaction-locked" };
          }

          const updated = {
            ...existing,
            ...updates,
            partnerPaymentStatus:
              updates.partnerPaymentStatus ??
              (updates.partnerPaidAt ?? existing.partnerPaidAt ? "PAID" : "UNPAID"),
          };

          set((state) => ({
            deliveryOrderTransactions: state.deliveryOrderTransactions.map((transaction) =>
              transaction.id === id ? updated : transaction,
            ),
          }));

          return { ok: true, record: updated };
        },
        removeDeliveryOrderTransaction: (id) => {
          const existing = get().deliveryOrderTransactions.find(
            (transaction) => transaction.id === id,
          );

          if (!existing) {
            return { ok: false, reason: "not-found" };
          }

          if (existing.salesInvoiceId) {
            return { ok: false, reason: "invoiced-transaction-locked" };
          }

          set((state) => ({
            deliveryOrderTransactions: state.deliveryOrderTransactions.filter(
              (transaction) => transaction.id !== id,
            ),
          }));

          return { ok: true, record: existing };
        },
        createInvoiceDraft: (draft) => {
          set({ invoiceDraft: draft });
          return { ok: true, record: draft };
        },
        clearInvoiceDraft: () => set({ invoiceDraft: undefined }),
        issueInvoice: (input) => {
          const state = get();

          if (state.invoices.some((invoice) => invoice.id === input.id)) {
            return { ok: false, reason: "duplicate-invoice-id" };
          }

          if (state.invoices.some((invoice) => invoice.invoiceNumber === input.invoiceNumber)) {
            return { ok: false, reason: "duplicate-invoice-number" };
          }

          const selectedTransactions = input.transactionIds
            .map((transactionId) =>
              state.deliveryOrderTransactions.find(
                (transaction) => transaction.id === transactionId,
              ),
            )
            .filter((transaction): transaction is DeliveryOrderTransaction => Boolean(transaction));

          if (selectedTransactions.length !== input.transactionIds.length) {
            return { ok: false, reason: "transaction-not-found" };
          }

          if (
            selectedTransactions.some(
              (transaction) => transaction.partnerPaymentStatus !== "PAID",
            )
          ) {
            return { ok: false, reason: "transaction-not-eligible" };
          }

          const validation = validateInvoiceSelection({
            transactions: selectedTransactions,
            deliveryOrders: state.deliveryOrders,
            activeInvoices: state.invoices,
          });

          if (!validation.ok) {
            return { ok: false, reason: "validation-failed", errors: validation.errors };
          }

          const ordersById = new Map(state.deliveryOrders.map((order) => [order.id, order]));
          const lines = selectedTransactions.map((transaction) =>
            createInvoiceLineSnapshot(transaction, ordersById.get(transaction.deliveryOrderId)!),
          );
          const invoice: SalesInvoice = {
            id: input.id,
            invoiceNumber: input.invoiceNumber,
            invoiceDate: input.invoiceDate,
            customerName: lines[0].customerName,
            customerBillingDetails: input.customerBillingDetails,
            purchaseOrderReference: input.purchaseOrderReference,
            transactionIds: input.transactionIds,
            status: "ISSUED",
            pph23Rate: input.pph23Rate,
            rentalDepositDeduction: input.rentalDepositDeduction,
            notes: input.notes,
            lines,
          };
          const transactionIds = new Set(input.transactionIds);

          set((currentState) => ({
            invoices: [invoice, ...currentState.invoices],
            invoiceDraft: undefined,
            deliveryOrderTransactions: currentState.deliveryOrderTransactions.map(
              (transaction) =>
                transactionIds.has(transaction.id)
                  ? { ...transaction, salesInvoiceId: invoice.id }
                  : transaction,
            ),
          }));

          return { ok: true, record: invoice };
        },
        cancelInvoice: (id) => {
          const existing = get().invoices.find((invoice) => invoice.id === id);

          if (!existing) {
            return { ok: false, reason: "not-found" };
          }

          if (existing.status === "PAID") {
            return { ok: false, reason: "paid-invoice-locked" };
          }

          const cancelled: SalesInvoice = { ...existing, status: "CANCELLED" };
          const transactionIds = new Set(existing.transactionIds);

          set((state) => ({
            invoices: state.invoices.map((invoice) =>
              invoice.id === id ? cancelled : invoice,
            ),
            deliveryOrderTransactions: state.deliveryOrderTransactions.map((transaction) =>
              transactionIds.has(transaction.id)
                ? { ...transaction, salesInvoiceId: undefined }
                : transaction,
            ),
          }));

          return { ok: true, record: cancelled };
        },
        markInvoicePaid: (id, paymentDate) => {
          const existing = get().invoices.find((invoice) => invoice.id === id);

          if (!existing) {
            return { ok: false, reason: "not-found" };
          }

          if (existing.status === "CANCELLED") {
            return { ok: false, reason: "cancelled-invoice-locked" };
          }

          const paid: SalesInvoice = { ...existing, status: "PAID", paymentDate };
          set((state) => ({
            invoices: state.invoices.map((invoice) => (invoice.id === id ? paid : invoice)),
          }));

          return { ok: true, record: paid };
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
        resetDemoData: () => set({ ...getSeedState(), hasHydrated: true }),
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
          invoices: state.invoices,
          partners: state.partners,
          deliveryOrderDraft: state.deliveryOrderDraft,
          invoiceDraft: state.invoiceDraft,
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
export const selectParentDeliveryOrders = (state: DemoStore) => state.deliveryOrders;
export const selectDeliveryOrderTransactions = (state: DemoStore) =>
  state.deliveryOrderTransactions;
export const selectEligibleInvoiceTransactions = (state: DemoStore) =>
  state.deliveryOrderTransactions.filter(
    (transaction) =>
      transaction.partnerPaymentStatus === "PAID" && !transaction.salesInvoiceId,
  );
export const selectInvoices = (state: DemoStore) => state.invoices;
export const selectPartners = (state: DemoStore) => state.partners;
export const selectCreatePartner = (state: DemoStore) => state.createPartner;
export const selectUpdateDeliveryOrder = (state: DemoStore) =>
  state.updateDeliveryOrder;
export const selectResetDemoData = (state: DemoStore) => state.resetDemoData;
export const selectDeliveryOrderDraft = (state: DemoStore) => state.deliveryOrderDraft;
export const selectSaveDeliveryOrderDraft = (state: DemoStore) => state.saveDeliveryOrderDraft;
export const selectClearDeliveryOrderDraft = (state: DemoStore) => state.clearDeliveryOrderDraft;
export const selectInvoiceDraft = (state: DemoStore) => state.invoiceDraft;
export const selectCreateInvoiceDraft = (state: DemoStore) => state.createInvoiceDraft;
export const selectClearInvoiceDraft = (state: DemoStore) => state.clearInvoiceDraft;

export const selectTransactionsForDeliveryOrder = (deliveryOrderId: string) =>
  (state: DemoStore) =>
    state.deliveryOrderTransactions.filter(
      (transaction) => transaction.deliveryOrderId === deliveryOrderId,
    );

export const selectInvoiceById = (id: string) =>
  (state: DemoStore) => state.invoices.find((invoice) => invoice.id === id);

export const selectInvoiceTransactions = (invoiceId: string) =>
  (state: DemoStore) => {
    const invoice = state.invoices.find((candidate) => candidate.id === invoiceId);

    if (!invoice) {
      return [];
    }

    const transactionIds = new Set(invoice.transactionIds);
    return state.deliveryOrderTransactions.filter((transaction) =>
      transactionIds.has(transaction.id),
    );
  };

export const selectInvoiceLines = (invoiceId: string) =>
  (state: DemoStore) =>
    state.invoices.find((invoice) => invoice.id === invoiceId)?.lines ?? [];

export function buildInvoiceDraft(input: Partial<InvoiceDraft>): InvoiceDraft {
  return {
    id: input.id ?? `inv-${Date.now()}`,
    invoiceNumber: input.invoiceNumber ?? "",
    invoiceDate: input.invoiceDate ?? new Date().toISOString().slice(0, 10),
    customerBillingDetails: input.customerBillingDetails ?? { name: "" },
    purchaseOrderReference: input.purchaseOrderReference,
    transactionIds: input.transactionIds ?? [],
    pph23Rate: input.pph23Rate ?? INVOICE_PPH23_RATE,
    rentalDepositDeduction: input.rentalDepositDeduction ?? 0,
  };
}
