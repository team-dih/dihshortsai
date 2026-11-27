import { Clapperboard } from "lucide-react";
import Link from "next/link";

import { PageHeading } from "@/components/dashboard/page-heading";
import { ProjectList } from "@/components/dashboard/project-list";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export default function OverviewPage() {
  return (
    <>
      <PageHeading title="Overview" description="Create a short video or pick up where you left off." />
      <Card className="bg-sidebar">
        <CardContent className="flex flex-wrap items-center justify-between gap-5 [--card-spacing:--spacing(6)]">
          <div className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border bg-muted/40">
              <Clapperboard className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <CardTitle>Start a new video</CardTitle>
              <CardDescription>Choose a template to create a project.</CardDescription>
            </div>
          </div>
          <Link href="/templates" className={buttonVariants({ size: "lg" })}>
            Browse templates
          </Link>
        </CardContent>
      </Card>
      <section aria-labelledby="recent-projects" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="recent-projects" className="text-lg font-semibold">Recent projects</h2>
          <Link href="/projects" className={buttonVariants({ variant: "ghost" })}>View all</Link>
        </div>
        <ProjectList limit={4} />
      </section>
    </>
  );
}
