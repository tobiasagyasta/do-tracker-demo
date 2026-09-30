"use client";

import { Button } from "@/components/ui/button";
import { selectResetDemoData } from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function DemoDataReset() {
  const resetDemoData = useDemoStore(selectResetDemoData);

  return (
    <Button type="button" variant="outline" size="sm" onClick={resetDemoData}>
      Reset Demo Data
    </Button>
  );
}
