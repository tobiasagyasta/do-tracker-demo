"use client";

import { DeliveryOrderTracker } from "@/components/delivery-orders/delivery-order-tracker";
import { StoreLoading } from "@/components/store-loading";
import {
  selectDeliveryOrderTransactions,
  selectDeliveryOrders,
  selectHasHydrated,
  selectInvoices,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function DeliveryOrderTrackerStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);
  const transactions = useDemoStore(selectDeliveryOrderTransactions);
  const invoices = useDemoStore(selectInvoices);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  return <DeliveryOrderTracker orders={orders} transactions={transactions} invoices={invoices} />;
}
