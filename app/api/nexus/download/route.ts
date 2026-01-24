import { NextRequest, NextResponse } from "next/server";

/**
 * Nexus 文件下载代理 API
 * 通过服务端代理下载文件，避免 CORS 和浏览器阻止弹出窗口的问题
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "缺少 URL 参数" }, { status: 400 });
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "无效的 URL 格式" }, { status: 400 });
    }

    // 通过服务端代理下载文件
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `下载失败: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // 获取文件内容
    const blob = await response.blob();

    // 从 URL 中提取文件名
    const urlPath = new URL(url).pathname;
    const filename = urlPath.split("/").pop() || "download";

    // 返回文件流
    return new NextResponse(blob, {
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": blob.size.toString(),
      },
    });
  } catch (error) {
    console.error("下载文件失败:", error);
    return NextResponse.json(
      {
        error: "下载失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

