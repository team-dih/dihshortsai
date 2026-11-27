"use client";

import { ArrowLeft, Clapperboard } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppSidebar, type SidebarSection } from "@/components/app-sidebar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type EditorLayoutProps = {
  name: string;
  onRename: (name: string) => void;
  sections: readonly SidebarSection[];
  activeItem: string;
  onSelect: (id: string) => void;
  heading: string;
  description: string;
  preview: ReactNode;
  action: ReactNode;
  status: string;
  children: ReactNode;
};

export function EditorLayout({
  name, onRename, sections, activeItem, onSelect, heading, description, preview, action, status, children,
}: EditorLayoutProps) {
  return (
    <AppSidebar title="Shorts Studio" icon={Clapperboard} sections={sections} activeItem={activeItem} onSelect={onSelect}>
      <header className="sticky top-0 z-10 flex min-h-16 items-center gap-3 border-b bg-background px-4 sm:px-6">
        <Link
          href="/projects"
          className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
          aria-label="Back to My Projects"
        >
          <ArrowLeft aria-hidden="true" />
        </Link>
        <Input
          aria-label="Project name"
          placeholder="Untitled project"
          className="h-9 max-w-72"
          value={name}
          onChange={(event) => onRename(event.target.value)}
          onBlur={() => {
            const cleanName = name.trim();
            if (cleanName !== name) onRename(cleanName);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        {action}
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 content-start items-start gap-5 p-3 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_auto]">
        <Card aria-labelledby="editor-section" className="min-w-0 bg-sidebar">
          <CardHeader className="border-b [--card-spacing:--spacing(5)]">
            <h1 id="editor-section" className="text-xl font-semibold tracking-tight">{heading}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </CardHeader>
          <CardContent className="[--card-spacing:--spacing(5)]">{children}</CardContent>
        </Card>
        <Card aria-labelledby="preview-heading" className="min-w-0 bg-sidebar lg:sticky lg:top-[5.25rem] lg:w-full lg:max-w-[clamp(17rem,calc(56.25dvh_-_5rem),42rem)] xl:w-[calc((100vw_-_18.75rem)/2.15)]">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-4">
              <h2 id="preview-heading" className="text-base font-medium">Preview</h2>
              <span className="text-xs text-muted-foreground">1080 × 1920</span>
            </div>
          </CardHeader>
          <CardContent className="grid min-w-0 place-items-center px-3 sm:px-4">
            <div className="relative flex aspect-[9/16] w-full max-w-[50dvh] flex-col items-center justify-center overflow-hidden rounded-xl bg-background/70 text-center ring-1 ring-border lg:max-w-none">
              {preview}
            </div>
            {status && <p role="status" className="mt-3 text-sm text-muted-foreground">{status}</p>}
          </CardContent>
        </Card>
      </main>
    </AppSidebar>
  );
}
