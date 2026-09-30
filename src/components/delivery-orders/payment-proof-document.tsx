"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatTonnage } from "@/lib/delivery-orders";
import { formatDateID, formatRupiah } from "@/lib/format";
import { canGeneratePaymentProof, getPaymentProofNumber } from "@/lib/payment-proof";
import { downloadPaymentProofPdf } from "@/lib/pdf/payment-proof-pdf";
import { cn } from "@/lib/utils";
import type { DeliveryOrder } from "@/types/delivery-order";

interface PaymentProofDocumentProps {
  order: DeliveryOrder;
}

export function PaymentProofDocument({ order }: PaymentProofDocumentProps) {
  if (!canGeneratePaymentProof(order)) {
    return (
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight">
          Bukti pembayaran belum tersedia.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Pembayaran ke mitra belum tercatat untuk Delivery Order ini.
        </p>
        <Link href={`/delivery-orders/${order.id}`} className={cn(buttonVariants(), "mt-5")}>
          Kembali ke Detail DO
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Link
          href={`/delivery-orders/${order.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" />
          Kembali ke DO
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
          <Button type="button" onClick={() => downloadPaymentProofPdf(order)}>
            <Download />
            Download PDF
          </Button>
        </div>
      </div>

      <article className="mx-auto max-w-4xl rounded-lg border bg-white p-6 text-zinc-950 shadow-sm md:p-10">
        <header className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-bold">[NAMA PERUSAHAAN]</p>
            <p className="mt-1 text-sm text-zinc-600">[Alamat Perusahaan]</p>
            <p className="text-sm text-zinc-600">[Telepon / Email]</p>
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-2xl font-bold tracking-tight">
              BUKTI PEMBAYARAN MITRA
            </h1>
            <p className="mt-2 text-sm">
              No Bukti: <span className="font-semibold">{getPaymentProofNumber(order)}</span>
            </p>
            <p className="text-sm">Tanggal Bayar: {formatDateID(order.partnerPaidAt)}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b py-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Informasi Mitra</h3>
            <div className="mt-3 space-y-2 text-sm">
              <InfoLine label="Nama Mitra" value={order.partnerName} />
              <InfoLine label="No Invoice Mitra" value={order.partnerInvoiceNumber} />
              <InfoLine label="Tanggal Pembayaran" value={formatDateID(order.partnerPaidAt)} />
              <InfoLine label="No DO" value={order.doNumber} />
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Status Pembayaran</h3>
            <div className="mt-3 space-y-2 text-sm">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Sudah Dibayar
              </Badge>
              <InfoLine label="Referensi Pembayaran" value="-" />
            </div>
          </div>
        </section>

        <section className="border-b py-6">
          <h3 className="font-semibold">Referensi Operasional</h3>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <InfoMini label="No DO" value={order.doNumber} />
            <InfoMini label="No Polisi" value={order.truckPlate} />
            <InfoMini label="Nama Pengemudi" value={order.driverName} />
            <InfoMini label="Tambang Asal" value={order.originMine} />
            <InfoMini label="Pelabuhan Tujuan" value={order.destinationPort} />
            <InfoMini label="Tanggal Muat" value={formatDateID(order.loadingDate)} />
            <InfoMini label="Tanggal Bongkar" value={formatDateID(order.unloadingDate)} />
            <InfoMini label="Tonase" value={formatTonnage(order.tonnage)} />
          </div>
        </section>

        <section className="border-b py-6">
          <h3 className="font-semibold">Rincian Pembayaran</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <PaymentRow label="Harga Angkut" value={formatRupiah(order.transportPrice)} />
                <PaymentRow label="Uang Jalan" value={formatRupiah(order.roadMoney)} />
                <PaymentRow label="Uang Pijak Gas" value={formatRupiah(order.gasMoney)} />
                <PaymentRow label="PPh 23" value={`-${formatRupiah(order.partnerPph23)}`} />
                <PaymentRow label="Total Pembelian" value={formatRupiah(order.purchaseTotal)} />
                <PaymentRow label="Total Dibayar" value={formatRupiah(order.purchaseTotal)} strong />
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-10 pt-10 text-center text-sm sm:grid-cols-3">
          <Signature label="Dibuat Oleh" />
          <Signature label="Diperiksa Oleh" />
          <Signature label="Disetujui Oleh" />
        </section>
      </article>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium">{value || "-"}</span>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function PaymentRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <tr className={strong ? "border-t-2 bg-emerald-50 font-bold" : "border-b"}>
      <td className="p-3">{label}</td>
      <td className="p-3 text-right">{value}</td>
    </tr>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <p>{label}</p>
      <div className="mx-auto mt-16 w-36 border-b border-zinc-400" />
    </div>
  );
}
