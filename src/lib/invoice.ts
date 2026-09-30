import type {
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliveryOrderTransaction,
  InvoiceTransactionLine,
  SalesInvoice,
} from "@/types/delivery-order";

export const INVOICE_PPH23_RATE = 0.02;

export interface InvoiceTotals {
  baseSalesValue: number;
  gasMoney: number;
  grossSales: number;
  pph23: number;
  netTotal: number;
}

export interface InvoiceGroupTotals {
  deliveryOrderId: string;
  doNumber: string;
  customerName: string;
  groupTonnage: number;
  groupHaulageAmount: number;
  groupRoadMoney: number;
  groupSubtotal: number;
  lines: InvoiceTransactionLine[];
}

export interface SalesInvoiceTotals {
  subtotal: number;
  pph23Amount: number;
  totalAfterTax: number;
  rentalDepositDeduction: number;
  grandTotal: number;
  groups: InvoiceGroupTotals[];
}

export type InvoiceValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

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

export function createInvoiceLineSnapshot(
  transaction: DeliveryOrderTransaction,
  deliveryOrder: DeliveryOrder,
): InvoiceTransactionLine {
  const haulageAmount = transaction.tonnage * transaction.salesRatePerTon;

  return {
    id: `line-${transaction.id}`,
    transactionId: transaction.id,
    deliveryOrderId: deliveryOrder.id,
    doNumber: deliveryOrder.doNumber,
    transactionNumber: transaction.transactionNumber,
    customerName: deliveryOrder.customerName,
    partnerName: deliveryOrder.partnerName,
    truckPlate: transaction.truckPlate,
    driverName: transaction.driverName,
    loadingDate: transaction.loadingDate,
    unloadingDate: transaction.unloadingDate,
    loadingLocation: transaction.loadingLocation,
    unloadingLocation: transaction.unloadingLocation,
    tonnage: transaction.tonnage,
    category: transaction.category,
    salesRatePerTon: transaction.salesRatePerTon,
    roadMoney: transaction.roadMoney,
    rentalDeposit: transaction.rentalDeposit,
    haulageAmount,
    lineTotal: haulageAmount + transaction.roadMoney,
  };
}

export function groupInvoiceLinesByDeliveryOrder(
  lines: InvoiceTransactionLine[],
): InvoiceGroupTotals[] {
  const groups = new Map<string, InvoiceGroupTotals>();

  for (const line of lines) {
    const existing = groups.get(line.deliveryOrderId) ?? {
      deliveryOrderId: line.deliveryOrderId,
      doNumber: line.doNumber,
      customerName: line.customerName,
      groupTonnage: 0,
      groupHaulageAmount: 0,
      groupRoadMoney: 0,
      groupSubtotal: 0,
      lines: [],
    };

    existing.groupTonnage += line.tonnage;
    existing.groupHaulageAmount += line.haulageAmount;
    existing.groupRoadMoney += line.roadMoney;
    existing.groupSubtotal += line.lineTotal;
    existing.lines.push(line);
    groups.set(line.deliveryOrderId, existing);
  }

  return [...groups.values()];
}

export function calculateSalesInvoiceTotals(invoice: SalesInvoice): SalesInvoiceTotals {
  const groups = groupInvoiceLinesByDeliveryOrder(invoice.lines);
  const subtotal = groups.reduce((total, group) => total + group.groupSubtotal, 0);
  // MVP rule: exact PPh 23 tax base must remain configurable as business rules mature.
  const pph23Amount = Math.round(subtotal * invoice.pph23Rate);
  const totalAfterTax = subtotal - pph23Amount;
  // MVP rule: DP Sewa is treated as a separate invoice-level deduction, not a line discount.
  const rentalDepositDeduction = invoice.rentalDepositDeduction;

  return {
    subtotal,
    pph23Amount,
    totalAfterTax,
    rentalDepositDeduction,
    grandTotal: totalAfterTax - rentalDepositDeduction,
    groups,
  };
}

export function validateInvoiceSelection(input: {
  transactions: DeliveryOrderTransaction[];
  deliveryOrders: DeliveryOrder[];
  activeInvoices: Pick<SalesInvoice, "status" | "transactionIds">[];
}): InvoiceValidationResult {
  const errors: string[] = [];
  const ordersById = new Map(input.deliveryOrders.map((order) => [order.id, order]));
  const customerNames = new Set<string>();
  const selectedIds = new Set(input.transactions.map((transaction) => transaction.id));
  const activeInvoiceTransactionIds = new Set(
    input.activeInvoices
      .filter((invoice) => invoice.status !== "CANCELLED")
      .flatMap((invoice) => invoice.transactionIds),
  );

  if (input.transactions.length === 0) {
    errors.push("Pilih minimal satu transaksi untuk invoice.");
  }

  for (const transaction of input.transactions) {
    const order = ordersById.get(transaction.deliveryOrderId);

    if (!order) {
      errors.push(`Delivery Order untuk transaksi ${transaction.transactionNumber} tidak ditemukan.`);
      continue;
    }

    customerNames.add(order.customerName);

    if (activeInvoiceTransactionIds.has(transaction.id) || transaction.salesInvoiceId) {
      errors.push(`Transaksi ${transaction.transactionNumber} sudah masuk invoice aktif.`);
    }
  }

  if (selectedIds.size !== input.transactions.length) {
    errors.push("Transaksi invoice tidak boleh duplikat.");
  }

  if (customerNames.size > 1) {
    errors.push("Semua transaksi dalam satu invoice harus berasal dari customer yang sama.");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function deriveAggregateDeliveryOrderStatus(
  transactions: DeliveryOrderTransaction[],
  invoices: Pick<SalesInvoice, "id" | "status" | "paymentDate">[] = [],
): DeliveryOrderStatus | "MIXED" {
  const statuses = new Set<DeliveryOrderStatus>();
  const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

  for (const transaction of transactions) {
    const invoice = transaction.salesInvoiceId
      ? invoicesById.get(transaction.salesInvoiceId)
      : undefined;

    if (invoice?.status === "PAID" || invoice?.paymentDate) {
      statuses.add("COMPLETED");
    } else if (invoice && invoice.status !== "CANCELLED") {
      statuses.add("WAITING_CUSTOMER_PAYMENT");
    } else if (transaction.partnerPaymentStatus === "PAID") {
      statuses.add("PARTNER_PAID_NOT_INVOICED");
    } else {
      statuses.add("UNPAID_PARTNER");
    }
  }

  return statuses.size === 1 ? [...statuses][0] : "MIXED";
}

export function legacyDeliveryOrderToTransaction(
  order: DeliveryOrder,
): DeliveryOrderTransaction {
  return {
    id: order.id,
    deliveryOrderId: order.id,
    transactionNumber: order.doNumber,
    truckPlate: order.truckPlate,
    driverName: order.driverName,
    loadingDate: order.loadingDate,
    unloadingDate: order.unloadingDate,
    loadingLocation: order.originMine,
    unloadingLocation: order.destinationPort,
    tonnage: order.tonnage,
    salesRatePerTon: order.tonnage > 0 ? order.sellingPrice / order.tonnage : 0,
    roadMoney: order.salesGasMoney,
    partnerRatePerTon: order.tonnage > 0 ? order.transportPrice / order.tonnage : 0,
    gasMoney: order.gasMoney,
    partnerInvoiceNumber: order.partnerInvoiceNumber,
    partnerPaidAt: order.partnerPaidAt,
    partnerPaymentStatus: order.partnerPaidAt ? "PAID" : "UNPAID",
    salesInvoiceId: order.salesInvoiceNumber ? order.salesInvoiceNumber : undefined,
  };
}

export function legacyDeliveryOrderToSalesInvoice(
  order: DeliveryOrder,
): SalesInvoice | undefined {
  if (!order.salesInvoiceNumber) {
    return undefined;
  }

  const transaction = legacyDeliveryOrderToTransaction(order);
  const line = createInvoiceLineSnapshot(transaction, order);

  return {
    id: order.salesInvoiceNumber,
    invoiceNumber: order.salesInvoiceNumber,
    invoiceDate: order.salesInvoiceDate ?? order.loadingDate,
    customerName: order.customerName,
    customerBillingDetails: { name: order.customerName },
    transactionIds: [transaction.id],
    status: order.customerPaidAt ? "PAID" : "ISSUED",
    paymentDate: order.customerPaidAt,
    pph23Rate: INVOICE_PPH23_RATE,
    rentalDepositDeduction: 0,
    lines: [line],
  };
}

export function getInvoicePaymentStatus(order: DeliveryOrder): string {
  return order.customerPaidAt ? "Sudah Dibayar" : "Menunggu Pembayaran";
}

export function sanitizeInvoiceFileName(invoiceNumber: string): string {
  return invoiceNumber.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-");
}
