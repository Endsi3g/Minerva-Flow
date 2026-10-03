export type RecordedVideo = { blob: Blob; extension: "mp4" | "webm" };

const CANDIDATE_TYPES: { mime: string; extension: "mp4" | "webm" }[] = [
  { mime: "video/mp4;codecs=avc1", extension: "mp4" },
  { mime: "video/mp4", extension: "mp4" },
  { mime: "video/webm;codecs=vp9", extension: "webm" },
  { mime: "video/webm", extension: "webm" },
];

export function pickVideoType(): { mime: string; extension: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  return CANDIDATE_TYPES.find((candidate) => MediaRecorder.isTypeSupported(candidate.mime)) ?? null;
}

/**
 * Records the canvas while `render(t)` animates t from 0 to 1 over
 * `animationMs`, then holds the final frame for `holdMs` so viewers can read
 * the real numbers. Runs entirely in the browser: nothing is uploaded.
 * Returns null when the browser cannot record video.
 */
export async function recordCanvasVideo(
  canvas: HTMLCanvasElement,
  render: (t: number) => void,
  animationMs = 4000,
  holdMs = 2000
): Promise<RecordedVideo | null> {
  const type = pickVideoType();
  if (!type || typeof canvas.captureStream !== "function") return null;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const finished = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  const startedAt = performance.now();
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      render(Math.min(1, elapsed / animationMs));
      if (elapsed < animationMs + holdMs) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  await finished;

  return { blob: new Blob(chunks, { type: type.mime.split(";")[0] }), extension: type.extension };
}
