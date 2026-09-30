"use client";

import { DeliveryOrderTracker } from "@/components/delivery-orders/delivery-order-tracker";
import { selectDeliveryOrders, selectHasHydrated } from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function DeliveryOrderTrackerStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);

  if (!hasHydrated) {
    return <p className="text-sm text-muted-foreground">Memuat data demo...</p>;
  }

  return <DeliveryOrderTracker orders={orders} />;
}
