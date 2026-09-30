import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  calculateOrderInvoiceTotals,
  getInvoicePaymentStatus,
  sanitizeInvoiceFileName,
} from "@/lib/invoice";
import { formatDateID, formatRupiah } from "@/lib/format";
import { formatTonnage } from "@/lib/delivery-orders";
import type { DeliveryOrder } from "@/types/delivery-order";

export function downloadInvoicePdf(order: DeliveryOrder) {
  if (!order.salesInvoiceNumber) {
    return;
  }

  const totals = calculateOrderInvoiceTotals(order);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("[NAMA PERUSAHAAN]", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("[Alamat Perusahaan]", 14, 24);
  doc.text("[Telepon / Email]", 14, 29);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 196, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`No Invoice: ${order.salesInvoiceNumber}`, 196, 26, { align: "right" });
  doc.text(`Tanggal: ${formatDateID(order.salesInvoiceDate)}`, 196, 31, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("Ditagihkan Kepada", 14, 45);
  doc.setFont("helvetica", "normal");
  doc.text(order.customerName, 14, 51);
  doc.text("Alamat: -", 14, 56);
  doc.text("NPWP: -", 14, 61);

  autoTable(doc, {
    startY: 72,
    head: [["Referensi DO", "Nilai"]],
    body: [
      ["No DO", order.doNumber],
      ["Tanggal Muat", formatDateID(order.loadingDate)],
      ["No Polisi", order.truckPlate],
      ["Pengemudi", order.driverName],
      ["Mitra", order.partnerName],
      ["Rute", `${order.originMine} -> ${order.destinationPort}`],
      ["Tonase", formatTonnage(order.tonnage)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [24, 24, 27] },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      : 120,
    head: [["Deskripsi", "Tonase", "Harga", "Jumlah"]],
    body: [[`Jasa Angkut DO ${order.doNumber}`, formatTonnage(order.tonnage), formatRupiah(order.sellingPrice), formatRupiah(order.sellingPrice)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [24, 24, 27] },
  });

  const totalsStartY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    : 160;

  autoTable(doc, {
    startY: totalsStartY,
    margin: { left: 112 },
    body: [
      ["Subtotal", formatRupiah(totals.baseSalesValue)],
      ["Uang Pijak Gas", formatRupiah(totals.gasMoney)],
      ["Total Sebelum PPh 23", formatRupiah(totals.grossSales)],
      ["PPh 23 (2%)", `-${formatRupiah(totals.pph23)}`],
      ["Total Setelah PPh 23", formatRupiah(totals.netTotal)],
    ],
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 253, 244];
      }
    },
  });

  const statusY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
    : 210;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Status Pembayaran: ${getInvoicePaymentStatus(order)}`, 14, statusY);
  if (order.customerPaidAt) {
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal Pembayaran: ${formatDateID(order.customerPaidAt)}`, 14, statusY + 5);
  }

  doc.save(`Invoice-${sanitizeInvoiceFileName(order.salesInvoiceNumber)}.pdf`);
}
