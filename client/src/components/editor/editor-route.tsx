"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { FakeTextEditor } from "@/components/editor/fake-text-editor";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectsReady, useProjectStore } from "@/lib/project-store";
import type { TemplateId } from "@/lib/templates";
import type { BackgroundClip } from "@/types/fake_text";

const editors = { "fake-text": FakeTextEditor } satisfies Record<TemplateId, typeof FakeTextEditor>;

export function EditorLoading() {
  return <main className="p-8 text-sm text-muted-foreground" role="status">Loading project…</main>;
}

export function EditorRoute({ backgrounds }: { backgrounds: BackgroundClip[] }) {
  const { projectId } = useParams<{ projectId: string }>();
  const ready = useProjectsReady();
  const record = useProjectStore((state) => state.projects.find(({ project }) => project.id === projectId));
  const updateProject = useProjectStore((state) => state.updateProject);

  if (!ready) return <EditorLoading />;

  if (!record) {
    return (
      <main className="grid min-h-dvh w-full place-items-center p-6">
        <Card className="w-full max-w-md bg-sidebar">
          <CardHeader>
            <CardTitle>Project unavailable</CardTitle>
            <CardDescription>This project is missing from this browser’s saved projects.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/projects" className={buttonVariants()}>Back to My Projects</Link>
          </CardFooter>
        </Card>
      </main>
    );
  }

  const Editor = editors[record.templateId];
  return <Editor key={projectId} project={record.project} backgrounds={backgrounds} update={(update) => updateProject(projectId, update)} />;
}
