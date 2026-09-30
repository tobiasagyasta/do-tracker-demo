"use client";

import { DeliveryOrderDetail } from "@/components/delivery-orders/delivery-order-detail";
import { StoreLoading } from "@/components/store-loading";
import { StoreNotFound } from "@/components/store-not-found";
import {
  selectDeliveryOrders,
  selectHasHydrated,
  selectUpdateDeliveryOrder,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function DeliveryOrderDetailStore({ id }: { id: string }) {
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
        title="Delivery Order tidak ditemukan."
        description="Data mungkin belum dibuat, sudah direset, atau URL yang dibuka tidak sesuai."
        href="/delivery-orders"
        actionLabel="Kembali ke Tracking DO"
      />
    );
  }

  return <DeliveryOrderDetail order={order} onUpdateOrder={updateDeliveryOrder} />;
}
