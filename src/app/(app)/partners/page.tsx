import { PartnerList } from "@/components/partners/partner-list";
import { mockPartners } from "@/data/mock-partners";

export default function PartnersPage() {
  return <PartnerList initialPartners={mockPartners} />;
}
