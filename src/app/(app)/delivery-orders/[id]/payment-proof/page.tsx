import { PaymentProofDocumentStore } from "@/components/delivery-orders/payment-proof-document-store";

export default async function PaymentProofPage({
  params,
}: PageProps<"/delivery-orders/[id]/payment-proof">) {
  const { id } = await params;

  return <PaymentProofDocumentStore id={id} />;
}
