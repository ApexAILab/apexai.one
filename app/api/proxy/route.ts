import { NextRequest, NextResponse } from "next/server";

/**
 * 后端代理 API Route
 * 用于在服务端转发请求，避免 CORS 问题和暴露敏感信息
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const { url, method = "GET", headers = {}, body: requestBody } = body;

    // 验证必要参数
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "缺少或无效的 URL 参数" },
        { status: 400 }
      );
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "无效的 URL 格式" },
        { status: 400 }
      );
    }

    // 构建 fetch 选项
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    // 如果有请求体，添加到选项中
    if (requestBody && method.toUpperCase() !== "GET") {
      fetchOptions.body =
        typeof requestBody === "string"
          ? requestBody
          : JSON.stringify(requestBody);
    }

    // 转发请求
    const response = await fetch(url, fetchOptions);

    // 获取响应内容
    const contentType = response.headers.get("content-type");
    let data;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // 返回响应（保持原始状态码和头部）
    return NextResponse.json(
      {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      },
      { status: response.status }
    );
  } catch (error) {
    // 错误处理
    console.error("代理请求失败:", error);
    return NextResponse.json(
      {
        error: "代理请求失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
