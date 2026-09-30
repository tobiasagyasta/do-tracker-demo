import { notFound } from "next/navigation";

import { DeliveryOrderDetail } from "@/components/delivery-orders/delivery-order-detail";
import { mockDeliveryOrders } from "@/data/mock-delivery-orders";

export default async function DeliveryOrderDetailPage({
  params,
}: PageProps<"/delivery-orders/[id]">) {
  const { id } = await params;
  const order = mockDeliveryOrders.find((deliveryOrder) => deliveryOrder.id === id);

  if (!order) {
    notFound();
  }

  return <DeliveryOrderDetail initialOrder={order} />;
}
