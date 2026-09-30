"use client";

import { InvoiceList } from "@/components/invoices/invoice-list";
import { StoreLoading } from "@/components/store-loading";
import { selectDeliveryOrders, selectHasHydrated } from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function InvoiceListStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  return <InvoiceList orders={orders} />;
}
