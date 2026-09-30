import { AppLayout } from "@/components/app-layout";

interface ApplicationLayoutProps {
  children: React.ReactNode;
}

export default function ApplicationLayout({ children }: ApplicationLayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
