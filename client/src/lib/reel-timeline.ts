import type { VideoProject } from "../types/fake_text";

export const reelFps = 30;
export const defaultMessageTransitionMs = 200;
export const maxMessageTransitionMs = 1000;
export const messageEasings = {
  linear: { label: "Linear", points: [0, 0, 1, 1] },
  "ease-in": { label: "Ease in", points: [1 / 3, 0, 2 / 3, 0] },
  "ease-out": { label: "Ease out", points: [1 / 3, 1, 2 / 3, 1] },
  "ease-in-out": { label: "Ease in-out", points: [0.42, 0, 0.58, 1] },
} as const;
export type MessageEasing = keyof typeof messageEasings;
export const defaultMessageEasing: MessageEasing = "ease-out";
export const bubbleFont = '41px "Helvetica Neue", Arial, sans-serif';
export const lineHeight = 56;
export const bubblePaddingY = 15;
export const bubbleGap = 17;
const linesPerPage = 13;
const maxPageHeight = linesPerPage * lineHeight + 2 * bubblePaddingY;

type Bubble = { lines: string[]; wrapped: boolean; from: number; page: number; outgoing: boolean };
type Narration = { from: number; frames: number; assetId: string };

function wrapText(text: string, width: (value: string) => number, maxTextWidth: number) {
  const lines: string[] = [];
  let wrapped = false;
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const joined = line ? line + " " + word : word;
      if (width(joined) <= maxTextWidth) {
        line = joined;
        continue;
      }
      wrapped = true;
      if (line) lines.push(line);
      line = "";
      for (const { segment } of new Intl.Segmenter().segment(word)) {
        if (line && width(line + segment) > maxTextWidth) {
          lines.push(line);
          line = "";
        }
        line += segment;
      }
    }
    lines.push(line);
  }
  return { lines, wrapped };
}

export function buildReelTimeline(
  messages: VideoProject["messages"],
  width: (value: string) => number,
  chatWidth = 100,
  messageTransitionMs = defaultMessageTransitionMs,
) {
  const revealFrames = Math.round(Math.max(0, Math.min(maxMessageTransitionMs, messageTransitionMs)) * reelFps / 1000);
  const widthPercent = Math.max(60, Math.min(100, chatWidth));
  const maxTextWidth = Math.floor(806 * widthPercent / 100) - 60;
  const bubbles: Bubble[] = [];
  const narration: Narration[] = [];
  let page = 0;
  let usedHeight = 0;
  let cursor = revealFrames;
  for (const message of messages) {
    const text = message.text.trim();
    if (!text) continue;
    const { lines, wrapped } = wrapText(text, width, maxTextWidth);
    const seconds = message.audio?.durationSeconds ?? Math.max(1.4, text.length / 15);
    const frames = Math.max(Math.ceil(lines.length / linesPerPage), Math.ceil(seconds * reelFps));
    if (message.audio) narration.push({ from: cursor, frames, assetId: message.audio.assetId });
    for (let i = 0; i < lines.length; i += linesPerPage) {
      const chunk = lines.slice(i, i + linesPerPage);
      const height = chunk.length * lineHeight + 2 * bubblePaddingY;
      if (usedHeight && usedHeight + bubbleGap + height > maxPageHeight) {
        page++;
        usedHeight = 0;
      }
      bubbles.push({ lines: chunk, wrapped, page, outgoing: message.senderId === "outgoing", from: cursor + Math.floor(frames * i / lines.length) });
      usedHeight += (usedHeight ? bubbleGap : 0) + height;
    }
    cursor += frames;
  }
  return { bubbles, narration, maxTextWidth, widthPercent, revealFrames, durationInFrames: Math.max(reelFps, cursor) };
}

