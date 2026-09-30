import Link from "next/link";

import { StatusBadge } from "@/components/delivery-orders/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateID, formatRupiah } from "@/lib/format";
import type { DeliveryOrder } from "@/types/delivery-order";

interface RecentDeliveryOrdersProps {
  orders: DeliveryOrder[];
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
          {orders.map((order) => (
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
                {formatTonnage(order.tonnage)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {order.salesInvoiceNumber ? formatRupiah(order.salesTotal) : "-"}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <StatusBadge status={order.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
