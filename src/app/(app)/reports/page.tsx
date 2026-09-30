import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { mockDeliveryOrders } from "@/data/mock-delivery-orders";

export default function ReportsPage() {
  return <ReportsDashboard orders={mockDeliveryOrders} />;
}
