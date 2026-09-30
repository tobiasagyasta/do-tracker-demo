import type { DeliveryOrder } from "@/types/delivery-order";

export const INVOICE_PPH23_RATE = 0.02;

export interface InvoiceTotals {
  baseSalesValue: number;
  gasMoney: number;
  grossSales: number;
  pph23: number;
  netTotal: number;
}

export function hasInvoice(order: DeliveryOrder): boolean {
  return Boolean(order.salesInvoiceNumber);
}

export function canCreateInvoice(order: DeliveryOrder): boolean {
  return order.status === "PARTNER_PAID_NOT_INVOICED" && !hasInvoice(order);
}

export function generateDemoInvoiceNumber(order: DeliveryOrder): string {
  const year = order.loadingDate.slice(0, 4);
  const numericId = order.doNumber.replace(/\D/g, "").slice(-6) || "1";

  return `INV/${year}/${numericId.padStart(6, "0")}`;
}

export function calculateInvoiceTotals(
  baseSalesValue: number,
  gasMoney: number,
): InvoiceTotals {
  const grossSales = baseSalesValue + gasMoney;
  const pph23 = Math.round(grossSales * INVOICE_PPH23_RATE);

  return {
    baseSalesValue,
    gasMoney,
    grossSales,
    pph23,
    netTotal: grossSales - pph23,
  };
}

export function calculateOrderInvoiceTotals(order: DeliveryOrder): InvoiceTotals {
  return calculateInvoiceTotals(order.sellingPrice, order.salesGasMoney);
}

export function getInvoicePaymentStatus(order: DeliveryOrder): string {
  return order.customerPaidAt ? "Sudah Dibayar" : "Menunggu Pembayaran";
}

export function sanitizeInvoiceFileName(invoiceNumber: string): string {
  return invoiceNumber.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-");
}
