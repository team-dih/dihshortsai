"use client";

import { ThemeToggle } from "@/components/theme";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, PanelLeft, X, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type SidebarItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  showChevron?: boolean;
  href?: string;
};

export type SidebarSection = {
  id: string;
  label?: string;
  items: readonly SidebarItem[];
};

type AppSidebarProps = {
  title: string;
  icon: LucideIcon;
  sections: readonly SidebarSection[];
  activeItem?: string;
  onSelect?: (id: string) => void;
  action?: { label: string; href: string; icon: LucideIcon };
};

const navigationItemClass = "h-11 w-full cursor-pointer justify-start gap-2.5 rounded-md border-0 px-3 text-sm font-normal hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 active:not-aria-[haspopup]:translate-y-0 aria-[current]:bg-white/10 md:h-9";

export function SidebarBrand({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-neutral-200 text-neutral-950">
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </span>
  );
}

export function SidebarNavigation({
  sections,
  activeItem,
  onSelect,
  action,
}: Pick<AppSidebarProps, "sections" | "activeItem" | "onSelect" | "action">) {
  return (
    <nav aria-label="Workspace" className="min-h-0 space-y-5 overflow-x-hidden overflow-y-auto pb-4">
      {action && (
        <div className="px-2 pt-1">
          <Link
            href={action.href}
            className={cn(buttonVariants({ size: "lg" }), "h-10 w-full justify-start px-3")}
            onClick={() => onSelect?.(action.href)}
          >
            <action.icon aria-hidden="true" />
            {action.label}
          </Link>
        </div>
      )}
      {sections.map((section) => (
        <div key={section.id}>
          {section.label && (
            <h2 className="mb-1 px-3 text-xs font-normal text-muted-foreground">
              {section.label}
            </h2>
          )}
          <ul>
            {section.items.map(({ id, label, icon: Icon, showChevron, href }) => {
              const isActive = activeItem === id;
              const select = () => onSelect?.(id);
              const content = (
                <>
                  <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  <span className="min-w-0 max-w-full truncate">{label}</span>
                  {showChevron && (
                    <ChevronRight aria-hidden="true" className="ml-auto size-3" />
                  )}
                </>
              );

              return (
                <li key={id}>
                  {href ? (
                    <Link
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={select}
                      className={cn(buttonVariants({ variant: "ghost" }), navigationItemClass)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <Button
                      variant="ghost"
                      aria-current={isActive ? "true" : undefined}
                      onClick={select}
                      className={navigationItemClass}
                    >
                      {content}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar({
  title,
  icon,
  sections,
  activeItem,
  onSelect,
  action,
  children,
}: AppSidebarProps & { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="flex min-h-dvh flex-1">
      <aside
        aria-label={title}
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-2 pb-3 text-sidebar-foreground md:flex"
      >
        <div className="flex shrink-0 items-center gap-2 px-3 pt-[18px] pb-7 text-base font-medium">
          <SidebarBrand icon={icon} />
          {title}
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
        <SidebarNavigation sections={sections} activeItem={activeItem} onSelect={onSelect} action={action} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center px-2 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open navigation" />}>
              <PanelLeft aria-hidden="true" />
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="gap-7 border-sidebar-border bg-sidebar px-2 pt-[13px] text-sidebar-foreground data-[side=left]:w-[232px] data-[side=left]:max-w-[calc(100vw-2rem)]"
            >
              <SheetTitle className="flex items-center gap-2 px-3 text-base leading-6 font-medium text-sidebar-foreground">
                <SidebarBrand icon={icon} />
                <span className="truncate">{title}</span>
              </SheetTitle>
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close navigation"
                    className="absolute top-3 right-2 opacity-0 pointer-events-none focus-visible:opacity-100"
                  />
                }
              >
                <X aria-hidden="true" />
              </SheetClose>
              <SidebarNavigation
                sections={sections}
                activeItem={activeItem}
                action={action}
                onSelect={(id) => {
                  setMobileOpen(false);
                  onSelect?.(id);
                }}
              />
            </SheetContent>
          </Sheet>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        {children}
      </div>
    </div>
  );
}
