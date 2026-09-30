import { DeliveryOrderDetailStore } from "@/components/delivery-orders/delivery-order-detail-store";

export default async function DeliveryOrderDetailPage({
  params,
}: PageProps<"/delivery-orders/[id]">) {
  const { id } = await params;

  return <DeliveryOrderDetailStore id={id} />;
}
