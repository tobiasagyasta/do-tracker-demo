"use client";

import { useMemo } from "react";

import { InvoiceBuilder } from "@/components/invoices/invoice-builder";
import { StoreLoading } from "@/components/store-loading";
import {
  selectDeliveryOrders,
  selectDeliveryOrderTransactions,
  selectHasHydrated,
  selectInvoiceDraft,
  selectInvoices,
  selectCreateInvoiceDraft,
  selectClearInvoiceDraft,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function InvoiceBuilderStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const deliveryOrders = useDemoStore(selectDeliveryOrders);
  const transactions = useDemoStore(selectDeliveryOrderTransactions);
  const invoices = useDemoStore(selectInvoices);
  const invoiceDraft = useDemoStore(selectInvoiceDraft);
  const createInvoiceDraft = useDemoStore(selectCreateInvoiceDraft);
  const clearInvoiceDraft = useDemoStore(selectClearInvoiceDraft);
  const issueInvoice = useDemoStore((state) => state.issueInvoice);
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

  return (
    <InvoiceBuilder
      deliveryOrders={deliveryOrders}
      eligibleTransactions={eligibleTransactions}
      invoices={invoices}
      invoiceDraft={invoiceDraft}
      onIssueInvoice={issueInvoice}
      onSaveDraft={createInvoiceDraft}
      onClearDraft={clearInvoiceDraft}
    />
  );
}
