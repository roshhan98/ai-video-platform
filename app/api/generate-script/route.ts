import { NextResponse } from "next/server";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import gTTS from "gtts";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const TARGET_DURATION_SECONDS = 24;
const SEGMENT_COUNT = 4;
const SEGMENT_DURATION_SECONDS = TARGET_DURATION_SECONDS / SEGMENT_COUNT;
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;
const FFMPEG_BINARY = resolveFfmpegPath();

type PexelsVideoFile = {
  link: string;
  quality?: string;
  width?: number;
  height?: number;
  file_type?: string;
};

type PexelsVideo = {
  video_files?: PexelsVideoFile[];
};

type PexelsVideoResponse = {
  videos?: PexelsVideo[];
};

type PexelsPhotoResponse = {
  photos?: Array<{
    src?: {
      landscape?: string;
      large2x?: string;
      original?: string;
    };
  }>;
};

async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = sanitizePrompt(body?.prompt);

    if (!prompt) {
      return NextResponse.json(
        { error: "Please enter a video idea first." },
        { status: 400 }
      );
    }

    if (!process.env.PEXELS_API_KEY) {
      return NextResponse.json(
        { error: "Missing PEXELS_API_KEY in your environment." },
        { status: 500 }
      );
    }

    if (!FFMPEG_BINARY) {
      return NextResponse.json(
        { error: "FFmpeg is not available on this machine." },
        { status: 500 }
      );
    }

    const timestamp = Date.now();
    const publicDir = path.join(process.cwd(), "public");
    const workDir = path.join(publicDir, "generated", String(timestamp));
    await fs.mkdir(workDir, { recursive: true });

    const script = await createNarration(prompt);
    const audioPath = path.join(workDir, "voice.mp3");
    await saveVoiceover(script, audioPath);

    const clips = await downloadPexelsVideos(prompt, workDir);
    const segments =
      clips.length > 0
        ? await createVideoSegments(clips, workDir)
        : await createImageSegments(prompt, workDir);

    const videoPath = path.join(workDir, "video.mp4");
    await muxFinalVideo(segments, audioPath, videoPath, workDir);

    return NextResponse.json({
      videoUrl: `/generated/${timestamp}/video.mp4`,
      duration: `${TARGET_DURATION_SECONDS} seconds`,
      script,
    });
  } catch (err) {
    console.error("Video generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate the video. Please try a different prompt." },
      { status: 500 }
    );
  }
}

export { POST };

function sanitizePrompt(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function resolveFfmpegPath() {
  const packagePath = typeof ffmpegPath === "string" ? ffmpegPath : "";

  if (packagePath && existsSync(packagePath)) {
    return packagePath;
  }

  const localPath = path.join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  );

  return existsSync(localPath) ? localPath : "";
}

async function createNarration(prompt: string) {
  const fallback = buildFallbackNarration(prompt);
  const apiKey = process.env.GROQ_API_KEY ?? process.env.GROK_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const groq = createGroq({ apiKey });
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      system:
        "Write concise voiceover narration for short social videos. Return only narration text, with no title, labels, markdown, stage directions, or emojis.",
      prompt: `Create a vivid 55 to 65 word voiceover for a 20 to 25 second video about: ${prompt}. Make it specific, polished, natural to speak, and suitable for stock footage.`,
      temperature: 0.7,
      maxOutputTokens: 120,
      maxRetries: 1,
    });

    return normalizeNarration(text) || fallback;
  } catch (error) {
    console.warn("Groq narration failed, using local fallback:", error);
    return fallback;
  }
}

function buildFallbackNarration(prompt: string) {
  return normalizeNarration(
    `Step into ${prompt}, where every detail tells a clearer story. In moments, we move from the big picture to the feeling behind it: the motion, the atmosphere, and the reason it matters. Watch how the scene builds with energy, focus, and a simple idea brought to life.`
  );
}

function normalizeNarration(text: string) {
  return text
    .replace(/[*#"`_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 70)
    .join(" ");
}

function saveVoiceover(script: string, audioPath: string) {
  return new Promise<void>((resolve, reject) => {
    const gtts = new gTTS(script, "en");
    gtts.save(audioPath, (error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function downloadPexelsVideos(prompt: string, workDir: string) {
  const response = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(
      prompt
    )}&per_page=8&orientation=landscape`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Pexels video search failed: ${response.status}`);
  }

  const data = (await response.json()) as PexelsVideoResponse;
  const videoUrls = (data.videos ?? [])
    .map((video) => pickBestVideoFile(video.video_files ?? []))
    .filter((file): file is PexelsVideoFile => Boolean(file))
    .map((file) => file.link)
    .slice(0, SEGMENT_COUNT);

  const downloads = await Promise.all(
    videoUrls.map(async (url, index) => {
      const clipPath = path.join(workDir, `clip-${index}.mp4`);
      await downloadFile(url, clipPath);
      return clipPath;
    })
  );

  return downloads;
}

function pickBestVideoFile(files: PexelsVideoFile[]) {
  const mp4Files = files.filter(
    (file) => file.file_type === "video/mp4" && file.link
  );

  return mp4Files
    .sort((a, b) => {
      const aScore = scoreVideoFile(a);
      const bScore = scoreVideoFile(b);
      return bScore - aScore;
    })
    .at(0);
}

function scoreVideoFile(file: PexelsVideoFile) {
  const width = file.width ?? 0;
  const height = file.height ?? 0;
  const resolutionScore = Math.min(width * height, OUTPUT_WIDTH * OUTPUT_HEIGHT);
  const qualityScore = file.quality === "hd" ? 1_000_000 : 0;
  return resolutionScore + qualityScore;
}

async function downloadFile(url: string, destination: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, buffer);
}

async function createVideoSegments(clips: string[], workDir: string) {
  const segments = await Promise.all(
    Array.from({ length: SEGMENT_COUNT }, async (_, index) => {
      const clip = clips[index % clips.length];
      const output = path.join(workDir, `segment-${index}.mp4`);

      await execFileAsync(FFMPEG_BINARY, [
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        clip,
        "-t",
        String(SEGMENT_DURATION_SECONDS),
        "-vf",
        `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},fps=30,setsar=1,format=yuv420p`,
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "21",
        output,
      ]);

      return output;
    })
  );

  return segments;
}

async function createImageSegments(prompt: string, workDir: string) {
  const imagePath = path.join(workDir, "fallback.jpg");
  await downloadPexelsImage(prompt, imagePath);

  const segments = await Promise.all(
    Array.from({ length: SEGMENT_COUNT }, async (_, index) => {
      const output = path.join(workDir, `segment-${index}.mp4`);
      const zoomDirection =
        index % 2 === 0 ? "zoom+0.0018" : "max(zoom-0.0012,1.0)";

      await execFileAsync(FFMPEG_BINARY, [
        "-y",
        "-loop",
        "1",
        "-i",
        imagePath,
        "-t",
        String(SEGMENT_DURATION_SECONDS),
        "-vf",
        `scale=${OUTPUT_WIDTH * 2}:${OUTPUT_HEIGHT * 2}:force_original_aspect_ratio=increase,crop=${OUTPUT_WIDTH * 2}:${OUTPUT_HEIGHT * 2},zoompan=z='if(eq(on,0),1.08,${zoomDirection})':d=180:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:fps=30,setsar=1,format=yuv420p`,
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "21",
        output,
      ]);

      return output;
    })
  );

  return segments;
}

async function downloadPexelsImage(prompt: string, imagePath: string) {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      prompt
    )}&per_page=1&orientation=landscape`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Pexels image search failed: ${response.status}`);
  }

  const data = (await response.json()) as PexelsPhotoResponse;
  const imageUrl =
    data.photos?.[0]?.src?.large2x ??
    data.photos?.[0]?.src?.landscape ??
    data.photos?.[0]?.src?.original;

  if (!imageUrl) {
    throw new Error("Pexels did not return a fallback image.");
  }

  await downloadFile(imageUrl, imagePath);
}

async function muxFinalVideo(
  segments: string[],
  audioPath: string,
  videoPath: string,
  workDir: string
) {
  const listPath = path.join(workDir, "segments.txt");
  const listContent = segments
    .map((segment) => `file '${segment.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
    .join("\n");

  await fs.writeFile(listPath, listContent);

  await execFileAsync(FFMPEG_BINARY, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-i",
    audioPath,
    "-t",
    String(TARGET_DURATION_SECONDS),
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11,apad",
    "-shortest",
    "-movflags",
    "+faststart",
    videoPath,
  ]);
}
