import { InvoiceList } from "@/components/invoices/invoice-list";
import { mockDeliveryOrders } from "@/data/mock-delivery-orders";

export default function InvoicesPage() {
  return <InvoiceList orders={mockDeliveryOrders} />;
}
