"use client";

import { PaymentProofDocument } from "@/components/delivery-orders/payment-proof-document";
import { StoreLoading } from "@/components/store-loading";
import { StoreNotFound } from "@/components/store-not-found";
import { selectDeliveryOrders, selectHasHydrated } from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function PaymentProofDocumentStore({ id }: { id: string }) {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);
  const order = orders.find((deliveryOrder) => deliveryOrder.id === id);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  if (!order) {
    return (
      <StoreNotFound
        title="Bukti pembayaran tidak ditemukan."
        description="Delivery Order untuk bukti pembayaran ini tidak tersedia di data demo saat ini."
        href="/delivery-orders"
        actionLabel="Kembali ke Tracking DO"
      />
    );
  }

  return <PaymentProofDocument order={order} />;
}
