"use client";

import type { ReactNode } from "react";
import { Clapperboard, CreditCard, FolderOpen, LayoutGrid, PanelsTopLeft, Plus, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

import { AppSidebar, type SidebarSection } from "@/components/app-sidebar";

const sections = [
  {
    id: "dashboard",
    label: "Workspace",
    items: [
      { id: "/", href: "/", label: "Overview", icon: LayoutGrid },
      { id: "/templates", href: "/templates", label: "Templates", icon: PanelsTopLeft },
      { id: "/projects", href: "/projects", label: "My Projects", icon: FolderOpen },
    ],
  },
  {
    id: "account",
    items: [
      { id: "/billing", href: "/billing", label: "Billing", icon: CreditCard },
      { id: "/settings", href: "/settings", label: "Settings", icon: Settings },
    ],
  },
] satisfies SidebarSection[];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AppSidebar
      title="Shorts Studio"
      icon={Clapperboard}
      sections={sections}
      activeItem={pathname}
      action={{ label: "Create Video", href: "/templates", icon: Plus }}
    >
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-[clamp(1.25rem,5.5%,4rem)] pt-8 pb-14 md:pt-14">
        {children}
      </main>
    </AppSidebar>
  );
}
