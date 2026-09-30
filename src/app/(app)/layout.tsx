import { AppLayout } from "@/components/app-layout";
import { DemoStoreProvider } from "@/stores/demo-store-provider";

interface ApplicationLayoutProps {
  children: React.ReactNode;
}

export default function ApplicationLayout({ children }: ApplicationLayoutProps) {
  return (
    <DemoStoreProvider>
      <AppLayout>{children}</AppLayout>
    </DemoStoreProvider>
  );
}
