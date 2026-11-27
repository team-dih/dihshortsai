"use client";

import { MessagesSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectsReady, useProjectStore } from "@/lib/project-store";
import { editorHref, templates, type TemplateId } from "@/lib/templates";

const templateOptions = Object.keys(templates) as TemplateId[];
const templateIcons = { "fake-text": MessagesSquare } satisfies Record<TemplateId, typeof MessagesSquare>;

export function TemplatePicker() {
  const router = useRouter();
  const ready = useProjectsReady();
  const createProject = useProjectStore((state) => state.createProject);
  const [creating, setCreating] = useState(false);

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {templateOptions.map((id) => {
        const Icon = templateIcons[id];
        return (
          <Card key={id} className="bg-sidebar">
            <div className="mx-4 grid aspect-video place-items-center rounded-lg border bg-background/60">
              <span className="grid size-16 place-items-center rounded-xl border bg-muted/40">
                <Icon className="size-7 text-foreground/80" strokeWidth={1.5} aria-hidden="true" />
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{templates[id].name}</CardTitle>
              <CardDescription>{templates[id].description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                size="lg"
                className="w-full"
                disabled={!ready || creating}
                onClick={() => {
                  setCreating(true);
                  router.push(editorHref(createProject(id)));
                }}
              >
                Use {templates[id].name}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
