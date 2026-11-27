import type { VideoProject } from "@/types/fake_text";

export const templates = {
  "fake-text": {
    name: "Fake Text",
    description: "Turn a text conversation into a vertical video.",
    createProject: (): VideoProject => ({
      id: crypto.randomUUID(),
      name: "Untitled Fake Text",
      participants: [
        { displayName: "Participant 1", avater: null, role: "incomming", voiceId: "", voiceSpeed: 1 },
        { displayName: "Participant 2", avater: null, role: "outgoing", voiceId: "", voiceSpeed: 1 },
      ],
      messages: [],
      background: {},
      appearence: {},
      audio: { speech: { rate: "x-fast", pitch: "high", volume: "medium" } },
    }),
  },
};

export type TemplateId = keyof typeof templates;

export function editorHref(projectId: string) {
  return `/editor/${projectId}`;
}
