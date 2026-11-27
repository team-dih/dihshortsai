"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { templates, type TemplateId } from "@/lib/templates";
import type { VideoProject } from "@/types/fake_text";

type ProjectRecord = {
  templateId: TemplateId;
  project: VideoProject;
};

type ProjectStore = {
  projects: ProjectRecord[];
  createProject: (templateId: TemplateId) => string;
  updateProject: (id: string, update: (project: VideoProject) => VideoProject) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      createProject: (templateId) => {
        const project = templates[templateId].createProject();
        set(({ projects }) => ({ projects: [{ templateId, project }, ...projects] }));
        return project.id;
      },
      updateProject: (id, update) =>
        set(({ projects }) => ({
          projects: projects.map((record) =>
            record.project.id === id ? { ...record, project: update(record.project) } : record,
          ),
        })),
      duplicateProject: (id) => {
        const original = get().projects.find(({ project }) => project.id === id);
        if (!original) return;

        const project = structuredClone(original.project);
        project.id = crypto.randomUUID();
        project.name = `${project.name.trim() || "Untitled project"} (copy)`;
        set(({ projects }) => ({ projects: [{ ...original, project }, ...projects] }));
      },
      deleteProject: (id) =>
        set(({ projects }) => ({ projects: projects.filter(({ project }) => project.id !== id) })),
    }),
    {
      name: "shorts-studio-projects",
      storage: createJSONStorage(() => ({
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
        removeItem: (key) => localStorage.removeItem(key),
      })),
      partialize: ({ projects }) => ({ projects }),
      skipHydration: true,
    },
  ),
);

let ready = false;
let hydration: Promise<void> | undefined;
const hydrationListeners = new Set<() => void>();

function subscribeToProjectHydration(listener: () => void) {
  hydrationListeners.add(listener);
  hydration ??= Promise.resolve(useProjectStore.persist.rehydrate()).finally(() => {
    ready = true;
    hydrationListeners.forEach((notify) => notify());
  });
  return () => hydrationListeners.delete(listener);
}

export function useProjectsReady() {
  return useSyncExternalStore(subscribeToProjectHydration, () => ready, () => false);
}
