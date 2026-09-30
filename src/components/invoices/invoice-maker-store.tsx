"use client";

import { InvoiceMaker } from "@/components/invoices/invoice-maker";
import { StoreLoading } from "@/components/store-loading";
import { StoreNotFound } from "@/components/store-not-found";
import {
  selectDeliveryOrders,
  selectHasHydrated,
  selectUpdateDeliveryOrder,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function InvoiceMakerStore({ id }: { id: string }) {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);
  const updateDeliveryOrder = useDemoStore(selectUpdateDeliveryOrder);
  const order = orders.find((deliveryOrder) => deliveryOrder.id === id);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  if (!order) {
    return (
      <StoreNotFound
        title="Invoice tidak ditemukan."
        description="Delivery Order untuk invoice ini tidak tersedia di data demo saat ini."
        href="/invoices"
        actionLabel="Kembali ke Daftar Invoice"
      />
    );
  }

  return <InvoiceMaker order={order} onUpdateOrder={updateDeliveryOrder} />;
}
