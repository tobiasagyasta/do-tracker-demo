import { Badge } from "@/components/ui/badge";
import {
  getDeliveryOrderStatusClassName,
  getDeliveryOrderStatusLabel,
} from "@/lib/delivery-order-status";
import type { DeliveryOrderStatus } from "@/types/delivery-order";

interface StatusBadgeProps {
  status: DeliveryOrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={getDeliveryOrderStatusClassName(status)}
    >
      {getDeliveryOrderStatusLabel(status)}
    </Badge>
  );
}
