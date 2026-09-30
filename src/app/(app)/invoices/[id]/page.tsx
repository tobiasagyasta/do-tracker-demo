import { notFound } from "next/navigation";

import { InvoiceMaker } from "@/components/invoices/invoice-maker";
import { mockDeliveryOrders } from "@/data/mock-delivery-orders";

export default async function InvoiceDetailPage({
  params,
}: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const order = mockDeliveryOrders.find((deliveryOrder) => deliveryOrder.id === id);

  if (!order) {
    notFound();
  }

  return <InvoiceMaker initialOrder={order} />;
}
