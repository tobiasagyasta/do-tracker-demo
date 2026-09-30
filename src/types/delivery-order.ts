export type DeliveryOrderStatus =
  | "UNPAID_PARTNER"
  | "PARTNER_PAID_NOT_INVOICED"
  | "WAITING_CUSTOMER_PAYMENT"
  | "COMPLETED";

export interface DeliveryOrder {
  id: string;
  doNumber: string;
  truckPlate: string;
  driverName: string;
  partnerName: string;
  customerName: string;
  originMine: string;
  destinationPort: string;
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
  unloadingDate?: string;
  partnerInvoiceNumber?: string;
  sellingPrice?: number;
  salesGasMoney?: number;
}
