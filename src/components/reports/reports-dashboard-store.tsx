"use client";

import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { StoreLoading } from "@/components/store-loading";
import { selectDeliveryOrders, selectHasHydrated } from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function ReportsDashboardStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  return <ReportsDashboard orders={orders} />;
}
