import { readBackgroundFile } from "./background-files";
import { readMessageAudio } from "./message-audio";
import type { BackgroundCrop, BackgroundVideo } from "../types/fake_text";

export type ReelMediaRequest = {
  background: (BackgroundVideo & { crop: BackgroundCrop }) | null;
  audioIds: string[];
};

async function dimensions(src: string) {
  const element = document.createElement("video");
  try {
    await new Promise<void>((resolve, reject) => {
      element.onloadedmetadata = () => resolve();
      element.onerror = () => reject(new Error("The background video could not be opened."));
      element.preload = "metadata";
      element.src = src;
    });
    return { width: element.videoWidth, height: element.videoHeight };
  } finally {
    element.onloadedmetadata = null;
    element.onerror = null;
    element.removeAttribute("src");
    element.load();
  }
}

export async function loadReelMedia({ background, audioIds }: ReelMediaRequest) {
  const urls: string[] = [];
  function urlFor(blob: Blob) {
    const src = URL.createObjectURL(blob);
    urls.push(src);
    return src;
  }
  const dispose = () => urls.forEach(url => URL.revokeObjectURL(url));
  try {
    const voices: Record<string, string> = {};
    const assets = await Promise.all(audioIds.map(readMessageAudio));
    assets.forEach((asset, index) => {
      if (!asset) throw new Error("A saved voice clip is missing. Generate it again in Conversation.");
      voices[audioIds[index]] = urlFor(asset.blob);
    });
    let layer = null;
    if (background) {
      let src: string;
      let width = 1080;
      let height = 1920;
      if (background.source === "upload") {
        const file = await readBackgroundFile(background.id);
        if (!file) throw new Error("Upload the background video again to preview this project.");
        src = urlFor(file);
        const natural = await dimensions(src);
        const scale = Math.max(width / natural.width, height / natural.height) * background.crop.zoom;
        width = natural.width * scale;
        height = natural.height * scale;
      } else {
        src = new URL(background.url, location.origin).href;
      }
      layer = { src, width, height, left: (1080 - width) * background.crop.horizontal / 100, top: (1920 - height) * background.crop.vertical / 100 };
    }
    return { voices, background: layer, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

