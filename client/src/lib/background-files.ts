import { runMediaTransaction } from "./media-store";

export function saveBackgroundFile(id: string, file: File) {
  return runMediaTransaction("backgrounds", "readwrite", (store) => store.put(file, id));
}

export function readBackgroundFile(id: string): Promise<Blob | undefined> {
  return runMediaTransaction("backgrounds", "readonly", (store) => store.get(id));
}

