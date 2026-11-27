import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function Layout({ children }: LayoutProps<"/">) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
