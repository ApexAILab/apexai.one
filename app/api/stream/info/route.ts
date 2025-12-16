import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import { ProxyAgent } from "undici";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { url, proxy } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    if (!ytdl.validateURL(url)) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // 构造代理（优先使用前端传入，其次使用环境变量）
    const rawProxy: string | undefined = proxy || process.env.STREAM_PROXY;
    let requestOptions: any | undefined;
    if (rawProxy) {
      const proxyUrl = rawProxy.startsWith("http") ? rawProxy : `http://${rawProxy}`;
      const dispatcher = new ProxyAgent(proxyUrl);
      requestOptions = { dispatcher };
    }

    const info = await ytdl.getInfo(url, requestOptions ? { requestOptions } : undefined);
    const details = info.videoDetails;
    const durationSeconds = Number(details.lengthSeconds || 0);

    const thumb =
      details.thumbnails?.[details.thumbnails.length - 1]?.url ||
      `https://i.ytimg.com/vi/${details.videoId}/hqdefault.jpg`;

    // 选取常用的 mp4 视频格式：按清晰度去重（每个 qualityLabel 只保留一条）
    const rawVideos = info.formats.filter(
      (f) =>
        f.hasVideo &&
        f.container === "mp4" &&
        f.qualityLabel &&
        f.hasAudio // 使用带音轨的封装，方便直接播放
    );

    const videoMap = new Map<
      string,
      { itag: number; label: string; size: number | null; height: number }
    >();
    for (const f of rawVideos) {
      const label = f.qualityLabel as string;
      const height = parseInt(label) || 0;
      const size = f.contentLength ? Number(f.contentLength) : 0;
      const existing = videoMap.get(label);
      // 保留体积更大的那条（一般码率更高）
      if (!existing || size > (existing.size || 0)) {
        videoMap.set(label, {
          itag: f.itag,
          label: `${label} (${f.container})`,
          size: f.contentLength ? Number(f.contentLength) : null,
          height,
        });
      }
    }
    const videoOptions = Array.from(videoMap.values())
      .sort((a, b) => b.height - a.height)
      .slice(0, 5)
      .map(({ itag, label, size }) => ({ itag, label, size }));

    // 选取音频格式：按 audioBitrate + container 去重
    const rawAudios = info.formats.filter((f) => f.hasAudio && !f.hasVideo);
    const audioMap = new Map<
      string,
      { itag: number; label: string; size: number | null; bitrate: number }
    >();
    for (const f of rawAudios) {
      const bitrate = f.audioBitrate || 0;
      const key = `${bitrate}-${f.container || "audio"}`;
      const size = f.contentLength ? Number(f.contentLength) : 0;
      const existing = audioMap.get(key);
      if (!existing || size > (existing.size || 0)) {
        audioMap.set(key, {
          itag: f.itag,
          label: `${bitrate || ""}kbps ${f.container || ""}`.trim(),
          size: f.contentLength ? Number(f.contentLength) : null,
          bitrate,
        });
      }
    }
    const audioOptions = Array.from(audioMap.values())
      .sort((a, b) => b.bitrate - a.bitrate)
      .slice(0, 5)
      .map(({ itag, label, size }) => ({ itag, label, size }));

    const response = {
      id: details.videoId,
      title: details.title,
      author: details.author?.name || "",
      duration: durationSeconds,
      thumbnail: thumb,
      url,
      videoOptions,
      audioOptions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("info error", error);
    return NextResponse.json({ error: "Failed to fetch info" }, { status: 500 });
  }
}
