import { DeliveryOrderTracker } from "@/components/delivery-orders/delivery-order-tracker";
import { mockDeliveryOrders } from "@/data/mock-delivery-orders";

export default function DeliveryOrdersPage() {
  return <DeliveryOrderTracker orders={mockDeliveryOrders} />;
}
