import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { formatDateID, formatNumberID, formatRupiah } from "@/lib/format";
import {
  calculatePartnerRecapTotals,
  PARTNER_RECAP_LABEL,
  type PartnerRecapFilters,
  type PartnerRecapRow,
} from "@/lib/partner-recap";
import { sanitizeInvoiceFileName } from "@/lib/invoice";

const pageWidth = 297;
const marginX = 10;

export function downloadPartnerRecapPdf(rows: PartnerRecapRow[], filters: PartnerRecapFilters) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const totals = calculatePartnerRecapTotals(rows);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(PARTNER_RECAP_LABEL.toUpperCase(), marginX, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Mitra: ${filters.partnerName === "ALL" ? "Semua Mitra" : filters.partnerName}`, marginX, 21);
  doc.text(`Periode: ${filters.dateFrom || "-"} s/d ${filters.dateTo || "-"}`, marginX, 26);
  doc.text(`Status: ${filters.paymentStatus}`, pageWidth - marginX, 21, { align: "right" });

  autoTable(doc, {
    startY: 34,
    head: [["No", "No SPB", "No Polisi", "Supir", "Tgl Muat", "Tgl Bongkar", "Lokasi Muat", "Lokasi Bongkar", "Netto", "Kategori", "Tarif", "Total Angkut", "Uang/Gas", "Total Bayar", "Status"]],
    body: rows.map((row, index) => [
      String(index + 1),
      row.transaction.transactionNumber,
      row.transaction.truckPlate,
      row.transaction.driverName,
      formatDateID(row.transaction.loadingDate),
      formatDateID(row.transaction.unloadingDate),
      row.transaction.loadingLocation,
      row.transaction.unloadingLocation,
      formatNumberID(row.transaction.tonnage, 3),
      row.transaction.category ?? "-",
      formatRupiah(row.transaction.partnerRatePerTon),
      formatRupiah(row.haulingAmount),
      formatRupiah(row.gasMoney),
      formatRupiah(row.totalPayment),
      row.transaction.partnerPaymentStatus === "PAID" ? "Sudah Dibayar" : "Belum Dibayar",
    ]),
    foot: [["", "TOTAL", "", "", "", "", "", "", formatNumberID(totals.totalTonnage, 3), "", "", formatRupiah(totals.totalHauling), formatRupiah(totals.totalGasMoney), formatRupiah(totals.totalPayment), ""]],
    showHead: "everyPage",
    showFoot: "lastPage",
    styles: { fontSize: 6.5, cellPadding: 1.4, valign: "middle" },
    headStyles: { fillColor: [31, 41, 55] },
    footStyles: { fillColor: [220, 252, 231], textColor: [20, 83, 45], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: marginX, right: marginX, bottom: 14 },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      8: { halign: "right", cellWidth: 14 },
      10: { halign: "right", cellWidth: 17 },
      11: { halign: "right", cellWidth: 20 },
      12: { halign: "right", cellWidth: 17 },
      13: { halign: "right", cellWidth: 20 },
    },
    didDrawPage: () => {
      const page = doc.getCurrentPageInfo().pageNumber;
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.text(`Halaman ${page} dari ${pageCount}`, pageWidth - marginX, 204, { align: "right" });
    },
  });

  doc.save(`${sanitizeInvoiceFileName(PARTNER_RECAP_LABEL)}-${Date.now()}.pdf`);
}
