"use client";

import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { StoreLoading } from "@/components/store-loading";
import {
  selectDeliveryOrderTransactions,
  selectDeliveryOrders,
  selectHasHydrated,
  selectInvoices,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function ReportsDashboardStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);
  const transactions = useDemoStore(selectDeliveryOrderTransactions);
  const invoices = useDemoStore(selectInvoices);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  return <ReportsDashboard orders={orders} transactions={transactions} invoices={invoices} />;
}
