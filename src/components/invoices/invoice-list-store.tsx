"use client";

import { InvoiceList } from "@/components/invoices/invoice-list";
import { StoreLoading } from "@/components/store-loading";
import {
  selectEligibleInvoiceTransactions,
  selectHasHydrated,
  selectInvoices,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function InvoiceListStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const invoices = useDemoStore(selectInvoices);
  const eligibleTransactions = useDemoStore(selectEligibleInvoiceTransactions);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  return <InvoiceList invoices={invoices} eligibleTransactions={eligibleTransactions} />;
}
