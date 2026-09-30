"use client";

import { InvoiceDetail } from "@/components/invoices/invoice-detail";
import { StoreLoading } from "@/components/store-loading";
import { StoreNotFound } from "@/components/store-not-found";
import { selectHasHydrated, selectInvoices } from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function InvoiceDetailStore({ invoiceId }: { invoiceId: string }) {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const invoices = useDemoStore(selectInvoices);
  const invoice = invoices.find((candidate) => candidate.id === invoiceId);

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  if (!invoice) {
    return (
      <StoreNotFound
        title="Invoice tidak ditemukan."
        description="Invoice ID tidak tersedia di data demo saat ini."
        href="/invoices"
        actionLabel="Kembali ke Daftar Invoice"
      />
    );
  }

  return <InvoiceDetail invoice={invoice} />;
}
