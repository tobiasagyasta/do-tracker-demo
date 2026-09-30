import { InvoiceDetailStore } from "@/components/invoices/invoice-detail-store";

export default async function InvoiceDetailPage({
  params,
}: PageProps<"/invoices/[invoiceId]">) {
  const { invoiceId } = await params;

  return <InvoiceDetailStore invoiceId={invoiceId} />;
}
