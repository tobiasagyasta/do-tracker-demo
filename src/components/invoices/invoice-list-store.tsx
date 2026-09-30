"use client";

import { useMemo } from "react";

import { InvoiceList } from "@/components/invoices/invoice-list";
import { StoreLoading } from "@/components/store-loading";
import {
  selectDeliveryOrderTransactions,
  selectHasHydrated,
  selectInvoices,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function InvoiceListStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const invoices = useDemoStore(selectInvoices);
  const transactions = useDemoStore(selectDeliveryOrderTransactions);
  const eligibleTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.partnerPaymentStatus === "PAID" && !transaction.salesInvoiceId,
      ),
    [transactions],
  );

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  return <InvoiceList invoices={invoices} eligibleTransactions={eligibleTransactions} />;
}
