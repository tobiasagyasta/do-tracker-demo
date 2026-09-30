import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateID, formatRupiah } from "@/lib/format";
import { transactionLifecycleLabels } from "@/lib/lifecycle";
import type { RecentDeliveryOrderSummary } from "@/lib/dashboard";

interface RecentDeliveryOrdersProps {
  orders: RecentDeliveryOrderSummary[];
}

const tonnageFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatTonnage(value: number): string {
  return `${tonnageFormatter.format(value)} ton`;
}

export function RecentDeliveryOrders({ orders }: RecentDeliveryOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Belum ada Delivery Order.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No DO</TableHead>
            <TableHead>Tanggal Muat</TableHead>
            <TableHead>Mitra</TableHead>
            <TableHead>Tambang</TableHead>
            <TableHead className="text-right">Tonase</TableHead>
            <TableHead className="text-right">Total Penjualan</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map(({ order, progress, salesAmount }) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/delivery-orders/${order.id}`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {order.doNumber}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDateID(order.loadingDate)}
              </TableCell>
              <TableCell className="min-w-48">{order.partnerName}</TableCell>
              <TableCell className="min-w-48">{order.customerName}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {formatTonnage(progress.totalTonnage)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {salesAmount > 0 ? formatRupiah(salesAmount) : "-"}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {progress.status === "MIXED"
                  ? "Campuran"
                  : transactionLifecycleLabels[progress.status]}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
