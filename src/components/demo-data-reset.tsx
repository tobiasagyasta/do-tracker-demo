"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { selectResetDemoData } from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function DemoDataReset() {
  const router = useRouter();
  const resetDemoData = useDemoStore(selectResetDemoData);

  function handleResetDemoData() {
    resetDemoData();
    router.push("/");
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleResetDemoData}>
      Reset Demo Data
    </Button>
  );
}
