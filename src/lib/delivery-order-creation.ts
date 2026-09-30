import type { CreateDeliveryOrderInput, DeliveryOrder } from "@/types/delivery-order";

export const PPH23_RATE = 0.02;

export interface DeliveryOrderDateValidationResult {
  valid: boolean;
  errors: string[];
}

function roundRupiah(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function generateNextDeliveryOrderNumber(
  orders: Pick<DeliveryOrder, "doNumber">[],
  year: string | number = new Date().getFullYear(),
): string {
  const prefix = `DO-${year}-`;
  const nextSequence =
    orders.reduce((highest, order) => {
      if (!order.doNumber.startsWith(prefix)) {
        return highest;
      }

      const sequence = Number.parseInt(order.doNumber.slice(prefix.length), 10);
      return Number.isNaN(sequence) ? highest : Math.max(highest, sequence);
    }, 0) + 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

export function normalizeVehiclePlate(plate: string): string {
  return plate.trim().replace(/\s+/g, " ").toUpperCase();
}

export function validateDeliveryOrderDates(
  input: Pick<
    CreateDeliveryOrderInput,
    "loadingDate" | "unloadingDate"
  >,
): DeliveryOrderDateValidationResult {
  const errors: string[] = [];

  if (!input.loadingDate) {
    errors.push("Tanggal muat wajib diisi.");
  }

  if (
    input.loadingDate &&
    input.unloadingDate &&
    input.unloadingDate < input.loadingDate
  ) {
    errors.push("Tanggal bongkar tidak boleh sebelum tanggal muat.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function calculatePartnerPph23(transportPrice: number): number {
  return roundRupiah(transportPrice * PPH23_RATE);
}

export function calculatePurchaseTotal(input: {
  transportPrice: number;
  roadMoney: number;
  gasMoney: number;
  partnerPph23?: number;
}): number {
  const partnerPph23 = input.partnerPph23 ?? calculatePartnerPph23(input.transportPrice);
  return roundRupiah(
    input.transportPrice + input.roadMoney + input.gasMoney - partnerPph23,
  );
}

export function calculateSalesPph23(sellingPrice: number): number {
  return roundRupiah(sellingPrice * PPH23_RATE);
}

export function calculateSalesTotal(input: {
  sellingPrice: number;
  salesGasMoney: number;
  salesPph23?: number;
}): number {
  const salesPph23 = input.salesPph23 ?? calculateSalesPph23(input.sellingPrice);
  return roundRupiah(input.sellingPrice + input.salesGasMoney - salesPph23);
}

export function calculateEstimatedGrossMargin(input: {
  purchaseTotal: number;
  salesTotal: number;
}): number {
  return roundRupiah(input.salesTotal - input.purchaseTotal);
}

export function createDeliveryOrderFromInput(
  input: CreateDeliveryOrderInput,
): DeliveryOrder {
  const sellingPrice = input.sellingPrice ?? 0;
  const salesGasMoney = input.salesGasMoney ?? 0;
  const partnerPph23 = calculatePartnerPph23(input.transportPrice);
  const purchaseTotal = calculatePurchaseTotal({
    transportPrice: input.transportPrice,
    roadMoney: input.roadMoney,
    gasMoney: input.gasMoney,
    partnerPph23,
  });
  const salesPph23 = calculateSalesPph23(sellingPrice);
  const salesTotal = calculateSalesTotal({
    sellingPrice,
    salesGasMoney,
    salesPph23,
  });

  return {
    id: input.id,
    doNumber: input.doNumber ?? "",
    truckPlate: normalizeVehiclePlate(input.truckPlate),
    driverName: input.driverName,
    partnerName: input.partnerName,
    customerName: input.customerName,
    originMine: input.originMine,
    destinationPort: input.destinationPort,
    loadingDate: input.loadingDate,
    unloadingDate: input.unloadingDate || undefined,
    tonnage: input.tonnage,
    partnerInvoiceNumber: input.partnerInvoiceNumber || undefined,
    transportPrice: input.transportPrice,
    roadMoney: input.roadMoney,
    gasMoney: input.gasMoney,
    partnerPph23,
    purchaseTotal,
    sellingPrice,
    salesGasMoney,
    salesPph23,
    salesTotal,
    status: "UNPAID_PARTNER",
  };
}
