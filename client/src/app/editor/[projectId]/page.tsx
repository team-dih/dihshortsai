import { readdir } from "node:fs/promises";
import path from "node:path";
import { Suspense } from "react";

import { EditorRoute, EditorLoading } from "@/components/editor/editor-route";

async function EditorWithBackgrounds() {
  const files = await readdir(path.join(process.cwd(), "public", "backgrounds"), { withFileTypes: true })
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
  const backgrounds = files
    .filter((file) => file.isFile() && /\.(mp4|webm|ogv|mov|m4v)$/i.test(file.name))
    .map(({ name }) => name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => ({ name, url: `/backgrounds/${encodeURIComponent(name)}` }));

  return <EditorRoute backgrounds={backgrounds} />;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorWithBackgrounds />
    </Suspense>
  );
}
