import { InvoiceMakerStore } from "@/components/invoices/invoice-maker-store";

export default async function InvoiceDetailPage({
  params,
}: PageProps<"/invoices/[id]">) {
  const { id } = await params;

  return <InvoiceMakerStore id={id} />;
}
