import { Badge } from "@/components/ui/badge";
import {
  getDeliveryOrderProgressClassName,
  getDeliveryOrderProgressLabel,
  getDeliveryOrderStatusClassName,
  getDeliveryOrderStatusLabel,
} from "@/lib/delivery-order-status";
import type { ParentDeliveryOrderProgressStatus } from "@/lib/lifecycle";
import type { DeliveryOrderStatus } from "@/types/delivery-order";

interface StatusBadgeProps {
  status: DeliveryOrderStatus;
}

interface ProgressStatusBadgeProps {
  status: ParentDeliveryOrderProgressStatus;
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

export function ProgressStatusBadge({ status }: ProgressStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={getDeliveryOrderProgressClassName(status)}
    >
      {getDeliveryOrderProgressLabel(status)}
    </Badge>
  );
}
