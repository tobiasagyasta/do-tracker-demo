import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { formatTonnage } from "@/lib/delivery-orders";
import { formatDateID, formatRupiah } from "@/lib/format";
import {
  getPaymentProofNumber,
  sanitizePaymentProofFileName,
} from "@/lib/payment-proof";
import type { DeliveryOrder } from "@/types/delivery-order";

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

export function downloadPaymentProofPdf(order: DeliveryOrder) {
  if (!order.partnerPaidAt) {
    return;
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const proofNumber = getPaymentProofNumber(order);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("[NAMA PERUSAHAAN]", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("[Alamat Perusahaan]", 14, 24);
  doc.text("[Telepon / Email]", 14, 29);

  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("BUKTI PEMBAYARAN MITRA", 196, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`No Bukti: ${proofNumber}`, 196, 26, { align: "right" });
  doc.text(`Tanggal Bayar: ${formatDateID(order.partnerPaidAt)}`, 196, 31, {
    align: "right",
  });

  autoTable(doc, {
    startY: 45,
    head: [["Informasi Mitra", "Nilai"]],
    body: [
      ["Nama Mitra", order.partnerName],
      ["No Invoice Mitra", order.partnerInvoiceNumber ?? "-"],
      ["Tanggal Pembayaran", formatDateID(order.partnerPaidAt)],
      ["No DO", order.doNumber],
      ["Status", "Sudah Dibayar"],
      ["Referensi Pembayaran", "-"],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [24, 24, 27] },
  });

  autoTable(doc, {
    startY: ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 85) + 10,
    head: [["Referensi Operasional", "Nilai"]],
    body: [
      ["No DO", order.doNumber],
      ["No Polisi", order.truckPlate],
      ["Nama Pengemudi", order.driverName],
      ["Tambang Asal", order.originMine],
      ["Pelabuhan Tujuan", order.destinationPort],
      ["Tanggal Muat", formatDateID(order.loadingDate)],
      ["Tanggal Bongkar", formatDateID(order.unloadingDate)],
      ["Tonase", formatTonnage(order.tonnage)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [24, 24, 27] },
  });

  autoTable(doc, {
    startY: ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 145) + 10,
    head: [["Rincian Pembayaran", "Jumlah"]],
    body: [
      ["Harga Angkut", formatRupiah(order.transportPrice)],
      ["Uang Jalan", formatRupiah(order.roadMoney)],
      ["Uang Pijak Gas", formatRupiah(order.gasMoney)],
      ["PPh 23", `-${formatRupiah(order.partnerPph23)}`],
      ["Total Pembelian", formatRupiah(order.purchaseTotal)],
      ["Total Dibayar", formatRupiah(order.purchaseTotal)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [24, 24, 27] },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === 5) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 253, 244];
      }
    },
  });

  const signatureY = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? 205) + 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  ["Dibuat Oleh", "Diperiksa Oleh", "Disetujui Oleh"].forEach((label, index) => {
    const x = 35 + index * 65;
    doc.text(label, x, signatureY, { align: "center" });
    doc.line(x - 22, signatureY + 28, x + 22, signatureY + 28);
  });

  doc.save(`Bukti-Pembayaran-${sanitizePaymentProofFileName(order.doNumber)}.pdf`);
}
