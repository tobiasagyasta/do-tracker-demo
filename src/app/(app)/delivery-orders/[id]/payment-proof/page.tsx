import { notFound } from "next/navigation";

import { PaymentProofDocument } from "@/components/delivery-orders/payment-proof-document";
import { mockDeliveryOrders } from "@/data/mock-delivery-orders";

export default async function PaymentProofPage({
  params,
}: PageProps<"/delivery-orders/[id]/payment-proof">) {
  const { id } = await params;
  const order = mockDeliveryOrders.find((deliveryOrder) => deliveryOrder.id === id);

  if (!order) {
    notFound();
  }

  return <PaymentProofDocument order={order} />;
}
