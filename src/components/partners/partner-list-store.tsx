"use client";

import { PartnerList } from "@/components/partners/partner-list";
import {
  selectCreatePartner,
  selectHasHydrated,
  selectPartners,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function PartnerListStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const partners = useDemoStore(selectPartners);
  const createPartner = useDemoStore(selectCreatePartner);

  if (!hasHydrated) {
    return <p className="text-sm text-muted-foreground">Memuat data demo...</p>;
  }

  return <PartnerList partners={partners} onCreatePartner={createPartner} />;
}
