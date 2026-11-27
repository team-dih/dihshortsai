import { Audio, Video } from "@remotion/media";
import { ChevronLeft, ChevronRight, Video as VideoIcon } from "lucide-react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { VideoProject } from "@/types/fake_text";
import { bubbleFont, bubbleGap, bubblePaddingY, lineHeight, messageEasings, type MessageEasing, type buildReelTimeline } from "@/lib/reel-timeline";

export type ReelProps = {
  timeline: ReturnType<typeof buildReelTimeline>;
  voices: Record<string, string>;
  background: { src: string; width: number; height: number; left: number; top: number } | null;
  contact: VideoProject["participants"][number];
  position: "top" | "center" | "bottom";
  messageEasing: MessageEasing;
  contactHeader: NonNullable<VideoProject["appearence"]["contactHeader"]>;
};

export function ReelComposition({ timeline, voices, background, contact, position, contactHeader, messageEasing }: ReelProps) {
  const frame = useCurrentFrame();
  const completed = timeline.bubbles.filter(bubble => bubble.from <= frame);
  const last = completed.at(-1);
  const showContactHeader = contactHeader === "always" || (last?.page ?? 0) === 0;
  const currentPage = completed.filter(bubble => bubble.page === last?.page);
  const next = timeline.bubbles[completed.length];
  const [x1, y1, x2, y2] = messageEasings[messageEasing].points;
  const progress = timeline.revealFrames > 0 && next && (!last || next.page === last.page) ? interpolate(frame, [Math.max(last?.from ?? 0, next.from - timeline.revealFrames), next.from], [0, 1], {
    easing: Easing.bezier(x1, y1, x2, y2), extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }) : 0;
  const paddingTop = 27;
  const paddingBottom = 15;
  const bubbleHeight = (bubble: typeof next) => bubble.lines.length * lineHeight + 2 * bubblePaddingY;
  const currentHeight = currentPage.reduce((height, bubble, i) => height + bubbleHeight(bubble) + (i ? bubbleGap : 0), 0);
  const visible = progress > 0 ? [...currentPage, next] : currentPage;
  const restingHeight = currentPage.length ? paddingTop + currentHeight + paddingBottom : 0;
  const addedHeight = progress > 0 ? bubbleHeight(next) + (last ? bubbleGap : paddingTop + paddingBottom) : 0;
  const name = contact.displayName.trim() || "Incoming";
  const initials = name.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toLocaleUpperCase();
  return (
    <AbsoluteFill style={{ backgroundColor: "#14171c", color: "white", fontFamily: "Arial, sans-serif", textAlign: "left" }}>
      {background && <Video src={background.src} muted loop objectFit="fill" style={{
        position: "absolute", width: background.width, height: background.height, left: background.left, top: background.top,
      }} />}
      <AbsoluteFill style={{ justifyContent: position === "top" ? "flex-start" : position === "bottom" ? "flex-end" : "center", padding: "258px 15px 258px 5px" }}>
        <Card style={{ width: `${timeline.widthPercent}%`, alignSelf: "center", display: "flex", flexDirection: "column", padding: 0, gap: 0, backgroundColor: "#000", color: "#fff", borderRadius: 44, overflow: "hidden", boxShadow: "none" }}>
          {showContactHeader && <CardHeader style={{
            position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
            height: 213, padding: "22px 140px 0", gap: 7, borderRadius: 0,
            background: "linear-gradient(65deg, #262626 45%, #212d39 79%, #233749 100%)",
          }}>
            <ChevronLeft aria-hidden color="#0c83fd" size={76} strokeWidth={2}
              style={{ position: "absolute", left: 18, top: 29 }} />
            <VideoIcon aria-hidden color="#0c83fd" size={85} strokeWidth={1.25}
              style={{ position: "absolute", right: 37, top: 26 }} />
            <div style={{
              flexShrink: 0, width: 108, height: 108, overflow: "hidden", borderRadius: 54,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 43, fontWeight: 500,
              background: "linear-gradient(#a6a9b0, #868c97)",
            }}>
              {contact.avater ? <Img src={contact.avater} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
            </div>
            <div style={{ display: "flex", maxWidth: "100%", alignItems: "center", font: bubbleFont, lineHeight: "49px" }}>
              <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{name}</span>
              <ChevronRight aria-hidden size={31} color="#a2a2a7" strokeWidth={2.5} style={{ flexShrink: 0 }} />
            </div>
          </CardHeader>}
          {visible.length > 0 && <div style={{ height: restingHeight + progress * addedHeight, overflow: "hidden" }}>
            <CardContent style={{ padding: `${paddingTop}px 54px ${paddingBottom}px`, display: "flex", flexDirection: "column", gap: bubbleGap }}>
            {visible.map((bubble, index, visibleBubbles) => {
              const showTail = visibleBubbles[index + 1]?.outgoing !== bubble.outgoing;
              const fill = bubble.outgoing ? "#0c83fd" : "#26262a";
              return (
                <div key={bubble.from} style={{
                  position: "relative", alignSelf: bubble.outgoing ? "flex-end" : "flex-start",
                  boxSizing: "content-box", width: bubble.wrapped ? timeline.maxTextWidth : "auto",
                  padding: `${bubblePaddingY}px 30px`, backgroundColor: fill, borderRadius: 46,
                  font: bubbleFont, lineHeight: `${lineHeight}px`,
                }}>
                  {showTail && <svg aria-hidden width="50" height="49" viewBox="0 0 20 20" style={{
                    position: "absolute", bottom: 0, ...(bubble.outgoing ? { right: -19 } : { left: -19 }),
                  }}>
                    <path fill={fill} transform={bubble.outgoing ? "translate(20 0) scale(-1 1)" : undefined}
                      d="M8 0H20V14C15 18 8 20 0 20C6 16 8 11 8 0Z" />
                  </svg>}
                  {bubble.lines.map((line, index) => <div key={index} style={{ position: "relative", whiteSpace: "pre", height: lineHeight }}>{line || " "}</div>)}
                </div>
              );
            })}
            </CardContent>
          </div>}
        </Card>
      </AbsoluteFill>
      {timeline.narration.map(cue => voices[cue.assetId] && (
        <Sequence key={cue.from} from={cue.from} durationInFrames={cue.frames} layout="none">
          <Audio src={voices[cue.assetId]} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

