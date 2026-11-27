"use client";

import { Copy, Ellipsis, ExternalLink, FolderOpen, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectsReady, useProjectStore } from "@/lib/project-store";
import { editorHref, templates } from "@/lib/templates";

export function ProjectList({ limit }: { limit?: number }) {
  const ready = useProjectsReady();
  const projects = useProjectStore((state) => state.projects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const duplicateProject = useProjectStore((state) => state.duplicateProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const [action, setAction] = useState<{ type: "rename" | "delete"; projectId: string } | null>(null);
  const [name, setName] = useState("");
  const renameInput = useRef<HTMLInputElement>(null);
  const selected = projects.find(({ project }) => project.id === action?.projectId)?.project;

  if (!ready) return <p role="status" className="text-sm text-muted-foreground">Loading projects…</p>;

  if (!projects.length) {
    return (
      <Card className="bg-sidebar">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <FolderOpen className="size-6 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>Choose a template to create your first project.</CardDescription>
          </div>
          <Link href="/templates" className={buttonVariants({ variant: "outline" })}>
            Browse templates
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="gap-0 bg-sidebar py-0">
        <ul className="divide-y divide-border">
          {projects.slice(0, limit).map(({ project, templateId }) => {
            const projectName = project.name.trim() || "Untitled project";
            const href = editorHref(project.id);
            return (
              <li key={project.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-muted/35">
                  <FolderOpen className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <Link href={href} className="block truncate rounded-sm font-medium hover:underline focus-visible:ring-2">
                    {projectName}
                  </Link>
                  <p className="text-sm text-muted-foreground">{templates[templateId].name}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${projectName}`} />}>
                    <Ellipsis aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={href} />}>
                      <ExternalLink aria-hidden="true" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setName(project.name);
                      setAction({ type: "rename", projectId: project.id });
                    }}>
                      <Pencil aria-hidden="true" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateProject(project.id)}>
                      <Copy aria-hidden="true" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setAction({ type: "delete", projectId: project.id })}>
                      <Trash2 aria-hidden="true" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      </Card>
      <Dialog open={Boolean(selected) && action?.type === "rename"} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent initialFocus={renameInput}>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>Give this project a new name.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(event) => {
            event.preventDefault();
            if (!selected || !name.trim()) return;
            updateProject(selected.id, (project) => ({ ...project, name: name.trim() }));
            setAction(null);
          }}>
            <div className="grid gap-2">
              <Label htmlFor="rename-project">Project name</Label>
              <Input id="rename-project" ref={renameInput} value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={!name.trim()}>Save name</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selected) && action?.type === "delete"} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              “{selected?.name.trim() || "Untitled project"}” will be permanently removed from this browser.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={() => {
              if (selected) deleteProject(selected.id);
              setAction(null);
            }}>
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
