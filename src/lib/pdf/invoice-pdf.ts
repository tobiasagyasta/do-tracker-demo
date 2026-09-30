import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  calculateSalesInvoiceTotals,
  type InvoiceGroupTotals,
  sanitizeInvoiceFileName,
} from "@/lib/invoice";
import {
  formatDateID,
  formatNumberID,
  formatRupiah,
  formatRupiahTerbilang,
} from "@/lib/format";
import type { SalesInvoice } from "@/types/delivery-order";

const pageWidth = 210;
const marginX = 14;
const footerY = 287;

type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };

export function downloadSalesInvoicePdf(invoice: SalesInvoice) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const totals = calculateSalesInvoiceTotals(invoice);
  const totalTonnage = invoice.lines.reduce((sum, line) => sum + line.tonnage, 0);

  renderInvoiceHeader(doc, invoice);
  renderCustomerBlock(doc, invoice, 48);
  renderMainGroupsTable(doc, totals.groups, 82);
  renderMainTotals(doc, invoice, (doc as AutoTableDoc).lastAutoTable?.finalY ?? 160);
  renderBankAndSignature(doc, invoice, totalTonnage);

  doc.addPage();
  renderAttachment(doc, invoice, totals.groups);
  addPageNumbers(doc);

  doc.save(`Invoice-${sanitizeInvoiceFileName(invoice.invoiceNumber)}.pdf`);
}

function renderInvoiceHeader(doc: jsPDF, invoice: SalesInvoice) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("[NAMA PERUSAHAAN]", marginX, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("[Alamat Perusahaan]", marginX, 24);
  doc.text("[Telepon / Email]", marginX, 29);
  doc.roundedRect(marginX, 34, 30, 14, 2, 2);
  doc.text("LOGO", marginX + 15, 43, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("INVOICE", pageWidth - marginX, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Tanggal: ${formatDateID(invoice.invoiceDate)}`, pageWidth - marginX, 28, { align: "right" });
  doc.text(`No Invoice: ${invoice.invoiceNumber}`, pageWidth - marginX, 34, { align: "right" });
  doc.text(`PO/Ref: ${invoice.purchaseOrderReference || "-"}`, pageWidth - marginX, 40, { align: "right" });
}

function renderCustomerBlock(doc: jsPDF, invoice: SalesInvoice, startY: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Ditagihkan Kepada", marginX, startY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(invoice.customerBillingDetails.name, marginX, startY + 7);
  doc.text(`Alamat: ${invoice.customerBillingDetails.address || "-"}`, marginX, startY + 13, { maxWidth: 110 });
  doc.text(`NPWP: ${invoice.customerBillingDetails.taxId || "-"}`, marginX, startY + 25);
}

function renderMainGroupsTable(doc: jsPDF, groups: InvoiceGroupTotals[], startY: number) {
  autoTable(doc, {
    startY,
    head: [["Grup", "Deskripsi DO", "Unit", "Tonase", "Tarif", "Hauling", "Uang Jalan", "Subtotal"]],
    body: groups.map((group, index) => {
      const rates = new Set(group.lines.map((line) => line.salesRatePerTon));
      return [
        String.fromCharCode(65 + index),
        `${group.doNumber}\n${group.lines[0]?.loadingLocation ?? "-"} - ${group.lines[0]?.unloadingLocation ?? "-"}`,
        `${group.lines.length} trx`,
        formatNumberID(group.groupTonnage, 3),
        rates.size === 1 ? formatRupiah(group.lines[0].salesRatePerTon) : "Mixed",
        formatRupiah(group.groupHaulageAmount),
        formatRupiah(group.groupRoadMoney),
        formatRupiah(group.groupSubtotal),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      2: { halign: "center", cellWidth: 17 },
      3: { halign: "right", cellWidth: 20 },
      4: { halign: "right", cellWidth: 25 },
      5: { halign: "right", cellWidth: 25 },
      6: { halign: "right", cellWidth: 24 },
      7: { halign: "right", cellWidth: 25 },
    },
    margin: { left: marginX, right: marginX, bottom: 26 },
    showHead: "everyPage",
  });
}

function renderMainTotals(doc: jsPDF, invoice: SalesInvoice, previousY: number) {
  const totals = calculateSalesInvoiceTotals(invoice);
  const totalTonnage = invoice.lines.reduce((sum, line) => sum + line.tonnage, 0);
  const startY = Math.min(previousY + 8, 214);

  autoTable(doc, {
    startY,
    margin: { left: 112, right: marginX, bottom: 42 },
    body: [
      ["Total Tonase", `${formatNumberID(totalTonnage, 3)} ton`],
      ["Subtotal", formatRupiah(totals.subtotal)],
      [`PPh 23 (${formatNumberID(invoice.pph23Rate * 100, 2)}%)`, `-${formatRupiah(totals.pph23Amount)}`],
      ["Subtotal Setelah Pajak", formatRupiah(totals.totalAfterTax)],
      ["DP Sewa", `-${formatRupiah(totals.rentalDepositDeduction)}`],
      ["Grand Total", formatRupiah(totals.grandTotal)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === 5) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
  });

  const terbilangY = ((doc as AutoTableDoc).lastAutoTable?.finalY ?? startY + 45) + 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Terbilang:", marginX, terbilangY);
  doc.setFont("helvetica", "italic");
  doc.text(formatRupiahTerbilang(totals.grandTotal), marginX + 20, terbilangY, { maxWidth: 170 });
}

function renderBankAndSignature(doc: jsPDF, invoice: SalesInvoice, totalTonnage: number) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Pembayaran dapat ditransfer ke:", marginX, 248);
  doc.text("Bank: [Nama Bank]", marginX, 254);
  doc.text("No Rekening: [0000000000]", marginX, 260);
  doc.text("Atas Nama: [Nama Perusahaan]", marginX, 266);

  doc.text(`Total tonase: ${formatNumberID(totalTonnage, 3)} ton`, marginX, 276);
  if (invoice.notes) {
    doc.text(`Catatan: ${invoice.notes}`, marginX, 282, { maxWidth: 100 });
  }

  doc.text("Hormat kami,", 154, 250);
  doc.line(154, 276, 194, 276);
  doc.text("[Nama Penandatangan]", 174, 282, { align: "center" });
}

function renderAttachment(doc: jsPDF, invoice: SalesInvoice, groups: InvoiceGroupTotals[]) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LAMPIRAN TRANSAKSI", marginX, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice: ${invoice.invoiceNumber}`, marginX, 25);
  doc.text(`Customer: ${invoice.customerName}`, marginX, 31);

  const body = groups.flatMap((group, groupIndex) => {
    const groupRows: Array<Array<string>> = [
      [String.fromCharCode(65 + groupIndex), group.doNumber, "", "", "", "", ""],
      ...group.lines.map((line, lineIndex) => [
        String(lineIndex + 1),
        line.transactionNumber,
        line.truckPlate,
        line.driverName,
        formatNumberID(line.tonnage, 3),
        line.rentalDeposit ? formatRupiah(line.rentalDeposit) : "-",
        formatRupiah(line.lineTotal),
      ]),
      ["", `Subtotal ${group.doNumber}`, "", "", formatNumberID(group.groupTonnage, 3), "", formatRupiah(group.groupSubtotal)],
    ];
    return groupRows;
  });
  const totalTonnage = invoice.lines.reduce((sum, line) => sum + line.tonnage, 0);
  body.push(["", "TOTAL TONASE", "", "", formatNumberID(totalTonnage, 3), "", ""]);

  autoTable(doc, {
    startY: 40,
    head: [["No", "No SPB / DO", "No Polisi", "Supir", "Tonase", "DP Sewa", "Jumlah"]],
    body,
    styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: marginX, right: marginX, bottom: 18 },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 24 },
      6: { halign: "right", cellWidth: 26 },
    },
    didParseCell: (data) => {
      const raw = Array.isArray(data.row.raw) ? data.row.raw : [];
      const firstCell = String(raw[0] ?? "");
      const secondCell = String(raw[1] ?? "");

      if (/^[A-Z]$/.test(firstCell)) {
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.fontStyle = "bold";
      }

      if (secondCell.startsWith("Subtotal") || secondCell === "TOTAL TONASE") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });
}

function addPageNumbers(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Halaman ${page} dari ${pageCount}`, pageWidth - marginX, footerY, { align: "right" });
  }
}
