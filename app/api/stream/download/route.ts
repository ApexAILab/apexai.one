import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import { Readable } from "stream";
import { ProxyAgent } from "undici";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const itagParam = searchParams.get("itag");
    const type = searchParams.get("type") || "video"; // video | audio
    const proxy = searchParams.get("proxy") || process.env.STREAM_PROXY || undefined;

    if (!url || !ytdl.validateURL(url)) {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    let requestOptions: any | undefined;
    if (proxy) {
      const proxyUrl = proxy.startsWith("http") ? proxy : `http://${proxy}`;
      const dispatcher = new ProxyAgent(proxyUrl);
      requestOptions = { dispatcher };
    }

    const itag = itagParam ? Number(itagParam) : undefined;
    const info = await ytdl.getInfo(url, requestOptions ? { requestOptions } : undefined);
    const title = info.videoDetails.title || "download";

    // 选择格式
    let format = itag ? ytdl.chooseFormat(info.formats, { quality: itag }) : null;
    if (!format || format.itag !== itag) {
      // fallback：依据类型选择默认
      if (type === "audio") {
        format = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });
      } else {
        format = ytdl.chooseFormat(info.formats, {
          quality: "highest",
          filter: (f) => f.hasVideo && f.hasAudio,
        });
      }
    }
    if (!format) {
      return NextResponse.json({ error: "No format found" }, { status: 404 });
    }

    const ext = format.container || (type === "audio" ? "mp3" : "mp4");
    const safeName = `${title}`.replace(/[\\/:*?"<>|]+/g, "_");
    const fileName = `${safeName}.${ext}`;

    const nodeStream = ytdl.downloadFromInfo(info, requestOptions ? { format, requestOptions } : { format });
    const stream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": type === "audio" ? "audio/mpeg" : "video/mp4",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error("download error", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
