"use client";

import { InvoiceBuilder } from "@/components/invoices/invoice-builder";
import { StoreLoading } from "@/components/store-loading";
import {
  selectDeliveryOrders,
  selectEligibleInvoiceTransactions,
  selectHasHydrated,
  selectInvoices,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function InvoiceBuilderStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const deliveryOrders = useDemoStore(selectDeliveryOrders);
  const eligibleTransactions = useDemoStore(selectEligibleInvoiceTransactions);
  const invoices = useDemoStore(selectInvoices);
  const issueInvoice = useDemoStore((state) => state.issueInvoice);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  return (
    <InvoiceBuilder
      deliveryOrders={deliveryOrders}
      eligibleTransactions={eligibleTransactions}
      invoices={invoices}
      onIssueInvoice={issueInvoice}
    />
  );
}
