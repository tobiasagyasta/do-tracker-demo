import { AppSidebar } from "@/components/app-sidebar";
import { DemoDataReset } from "@/components/demo-data-reset";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      <AppSidebar />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground lg:hidden">
                Mining Transport
              </p>
              <h1 className="text-base font-semibold tracking-tight">
                Operations System
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                Demo MVP · Data simulasi
              </div>
              <DemoDataReset />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
