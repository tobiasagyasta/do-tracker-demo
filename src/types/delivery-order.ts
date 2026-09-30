export type DeliveryOrderStatus =
  | "UNPAID_PARTNER"
  | "PARTNER_PAID_NOT_INVOICED"
  | "WAITING_CUSTOMER_PAYMENT"
  | "COMPLETED";

export type PartnerPaymentStatus = "UNPAID" | "PAID";

export type SalesInvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";

export type AggregateDeliveryOrderStatus = DeliveryOrderStatus | "MIXED";

export interface DeliveryOrderCommercialDefaults {
  salesRatePerTon: number;
  roadMoney: number;
  rentalDeposit?: number;
  partnerRatePerTon: number;
  gasMoney: number;
}

export interface DeliveryOrderSummaryState {
  transactionCount: number;
  totalTonnage: number;
  aggregateStatus: AggregateDeliveryOrderStatus;
}

export interface CreateParentDeliveryOrderInput {
  id: string;
  doNumber: string;
  customerName: string;
  partnerName: string;
  originMine: string;
  destinationPort: string;
  defaultRates?: DeliveryOrderCommercialDefaults;
}

export interface DeliveryOrder {
  id: string;
  doNumber: string;
  customerName: string;
  partnerName: string;
  originMine: string;
  destinationPort: string;
  defaultRates?: DeliveryOrderCommercialDefaults;
  summary?: DeliveryOrderSummaryState;

  // Legacy single-transaction fields are retained until persisted Zustand data is migrated.
  truckPlate: string;
  driverName: string;
  loadingDate: string;
  unloadingDate?: string;
  tonnage: number;
  partnerInvoiceNumber?: string;
  transportPrice: number;
  roadMoney: number;
  gasMoney: number;
  partnerPph23: number;
  purchaseTotal: number;
  partnerPaidAt?: string;
  salesInvoiceNumber?: string;
  salesInvoiceDate?: string;
  sellingPrice: number;
  salesGasMoney: number;
  salesPph23: number;
  salesTotal: number;
  customerPaidAt?: string;
  status: DeliveryOrderStatus;
}

export interface DeliveryOrderTransaction {
  id: string;
  deliveryOrderId: string;
  transactionNumber: string;
  truckPlate: string;
  driverName: string;
  loadingDate: string;
  unloadingDate?: string;
  loadingLocation: string;
  unloadingLocation: string;
  tonnage: number;
  category?: string;
  salesRatePerTon: number;
  roadMoney: number;
  rentalDeposit?: number;
  partnerRatePerTon: number;
  gasMoney: number;
  partnerInvoiceNumber?: string;
  partnerPaidAt?: string;
  partnerPaymentStatus: PartnerPaymentStatus;
  salesInvoiceId?: string;
}

export interface CreateDeliveryOrderTransactionInput {
  id: string;
  deliveryOrderId: string;
  transactionNumber: string;
  truckPlate: string;
  driverName: string;
  loadingDate: string;
  unloadingDate?: string;
  loadingLocation: string;
  unloadingLocation: string;
  tonnage: number;
  category?: string;
  salesRatePerTon: number;
  roadMoney: number;
  rentalDeposit?: number;
  partnerRatePerTon: number;
  gasMoney: number;
  partnerInvoiceNumber?: string;
  partnerPaidAt?: string;
}

export interface SalesInvoiceCustomerBillingDetails {
  name: string;
  address?: string;
  taxId?: string;
}

export interface InvoiceTransactionLine {
  id: string;
  transactionId: string;
  deliveryOrderId: string;
  doNumber: string;
  transactionNumber: string;
  customerName: string;
  partnerName: string;
  truckPlate: string;
  driverName: string;
  loadingDate: string;
  unloadingDate?: string;
  loadingLocation: string;
  unloadingLocation: string;
  tonnage: number;
  category?: string;
  salesRatePerTon: number;
  roadMoney: number;
  rentalDeposit?: number;
  haulageAmount: number;
  lineTotal: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerBillingDetails: SalesInvoiceCustomerBillingDetails;
  purchaseOrderReference?: string;
  transactionIds: string[];
  status: SalesInvoiceStatus;
  paymentDate?: string;
  pph23Rate: number;
  rentalDepositDeduction: number;
  deductions?: number;
  lines: InvoiceTransactionLine[];
}

export interface InvoiceDraft {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerBillingDetails: SalesInvoiceCustomerBillingDetails;
  purchaseOrderReference?: string;
  transactionIds: string[];
  pph23Rate: number;
  rentalDepositDeduction: number;
}

export interface IssueSalesInvoiceInput extends InvoiceDraft {
  id: string;
}

export interface CreateDeliveryOrderInput {
  id: string;
  doNumber?: string;
  truckPlate: string;
  driverName: string;
  partnerName: string;
  customerName: string;
  originMine: string;
  destinationPort: string;
  loadingDate: string;
  tonnage: number;
  transportPrice: number;
  roadMoney: number;
  gasMoney: number;
  partnerPph23?: number;
  unloadingDate?: string;
  partnerInvoiceNumber?: string;
  sellingPrice?: number;
  salesGasMoney?: number;
  salesPph23?: number;
}
