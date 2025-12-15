import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "缺少文件" },
        { status: 400 }
      );
    }

    // 上传优先 imageproxy.zhongzhuan.chat，失败则回退 0x0.st，再回退 catbox
    const tryImageProxy = async () => {
      const form = new FormData();
      form.append("file", file, (file as File).name || "upload.bin");
      const res = await fetch("https://imageproxy.zhongzhuan.chat/api/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json?.url) {
        throw new Error(`imageproxy失败(${res.status}): ${JSON.stringify(json)}`);
      }
      return String(json.url).trim();
    };

    const try0x0 = async () => {
      const form = new FormData();
      form.append("file", file, (file as File).name || "upload.bin");
      const res = await fetch("https://0x0.st", {
        method: "POST",
        body: form,
      });
      const text = await res.text();
      if (!res.ok || !text.trim().startsWith("https://0x0.st/")) {
        throw new Error(`0x0.st失败(${res.status}): ${text}`);
      }
      return text.trim();
    };

    const tryCatbox = async () => {
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", file, (file as File).name || "upload.bin");

      const res = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: form,
      });
      const text = await res.text();
      if (!res.ok || !text.trim().startsWith("https://")) {
        throw new Error(`catbox失败(${res.status}): ${text}`);
      }
      return text.trim();
    };

    let url = "";
    try {
      url = await tryImageProxy();
    } catch (errImg) {
      try {
        url = await try0x0();
      } catch (err0x0) {
        url = await tryCatbox();
      }
    }

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
