import type { DeliveryOrder, DeliveryOrderTransaction } from "@/types/delivery-order";

// Three paid, uninvoiced DO groups for one cross-DO invoice demonstration.
const customerName = "PT Karya Bara Indonesia";

const groups = [
  {
    id: "do-showcase-kbd",
    doNumber: "DO KBD",
    partnerName: "PT Angkutan Bara Sejahtera",
    originMine: "Pit Kembang Damai, Kutai Kartanegara",
    destinationPort: "Jetty Samarinda",
    salesRatePerTon: 1200000,
    partnerRatePerTon: 900000,
    roadMoney: 4500000,
    gasMoney: 4200000,
    trips: [
      ["B 9142 UYX", "Agus Santoso", "2026-10-01", 31.8, "2026-10-06"],
      ["B 9031 UYR", "Maman Firmansyah", "2026-10-02", 29.4, "2026-10-07"],
      ["B 8872 UZA", "Rizal Pratama", "2026-10-03", 30.6, "2026-10-08"],
      ["B 9214 UZB", "Yusuf Maulana", "2026-10-04", 32.1, "2026-10-09"],
    ],
  },
  {
    id: "do-showcase-ationg-teap",
    doNumber: "DO ATIONG/TEAP",
    partnerName: "PT Mitra Logistik Nusantara",
    originMine: "Site Teap, Tanah Bumbu",
    destinationPort: "Pelabuhan Satui",
    salesRatePerTon: 1175000,
    partnerRatePerTon: 875000,
    roadMoney: 4200000,
    gasMoney: 3900000,
    trips: [
      ["DA 7654 JL", "Bambang Suryadi", "2026-10-03", 33.2, "2026-10-08"],
      ["DA 8120 JM", "Sofyan Hadi", "2026-10-04", 32.5, "2026-10-09"],
      ["DA 9021 MQ", "Mulyadi Rahman", "2026-10-05", 34.1, "2026-10-10"],
      ["DA 8873 MR", "Farhan Aziz", "2026-10-06", 30.9, "2026-10-11"],
    ],
  },
  {
    id: "do-showcase-cmk-niaso",
    doNumber: "DO CMK/NIASO",
    partnerName: "CV Karya Transport",
    originMine: "Pit Niaso, Muara Enim",
    destinationPort: "Pelabuhan Kertapati",
    salesRatePerTon: 1250000,
    partnerRatePerTon: 940000,
    roadMoney: 4700000,
    gasMoney: 4350000,
    trips: [
      ["BG 8187 LK", "Dedi Kurniawan", "2026-10-05", 28.9, "2026-10-10"],
      ["BG 8341 LM", "Eko Purnomo", "2026-10-06", 29.9, "2026-10-11"],
      ["BG 7692 LN", "Wawan Kurnia", "2026-10-07", 30.4, "2026-10-12"],
      ["BG 9056 LP", "Arman Saputra", "2026-10-08", 31.3, "2026-10-13"],
    ],
  },
] as const;

export const showcaseDeliveryOrders: DeliveryOrder[] = groups.map((group) => ({
  id: group.id,
  doNumber: group.doNumber,
  customerName,
  partnerName: group.partnerName,
  originMine: group.originMine,
  destinationPort: group.destinationPort,
  defaultRates: {
    salesRatePerTon: group.salesRatePerTon,
    partnerRatePerTon: group.partnerRatePerTon,
    roadMoney: group.roadMoney,
    gasMoney: group.gasMoney,
  },
  truckPlate: "",
  driverName: "",
  loadingDate: "",
  tonnage: 0,
  transportPrice: 0,
  roadMoney: group.roadMoney,
  gasMoney: group.gasMoney,
  partnerPph23: 0,
  purchaseTotal: 0,
  sellingPrice: 0,
  salesGasMoney: group.roadMoney,
  salesPph23: 0,
  salesTotal: 0,
  status: "PARTNER_PAID_NOT_INVOICED",
}));

export const showcaseDeliveryOrderTransactions: DeliveryOrderTransaction[] = groups.flatMap(
  (group) => group.trips.map(([truckPlate, driverName, loadingDate, tonnage, partnerPaidAt], index) => ({
    id: `trx-${group.id}-${index + 1}`,
    deliveryOrderId: group.id,
    transactionNumber: `SPB-${group.id.slice(12).toUpperCase()}-2610-${String(index + 1).padStart(2, "0")}`,
    truckPlate,
    driverName,
    loadingDate,
    unloadingDate: new Date(Date.parse(`${loadingDate}T00:00:00Z`) + 86400000).toISOString().slice(0, 10),
    loadingLocation: group.originMine,
    unloadingLocation: group.destinationPort,
    tonnage,
    salesRatePerTon: group.salesRatePerTon,
    roadMoney: group.roadMoney,
    partnerRatePerTon: group.partnerRatePerTon,
    gasMoney: group.gasMoney,
    partnerPaidAt,
    partnerPaymentStatus: "PAID" as const,
  })),
);
