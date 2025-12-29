"use client";

import { useState, useRef } from "react";
import { X, Download, Loader2, Upload } from "lucide-react";

interface Post {
  id: string;
  content: string;
  tags: string[];
  images: string[];
  createdAt: string;
}

/**
 * SecondBrain 设置弹窗组件
 * 参考 Nexus 的设置界面风格
 */
export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // 导出相关状态
  const [exportMode, setExportMode] = useState<"all" | "range">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportCount, setExportCount] = useState<number | null>(null);

  // 导入相关状态
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 导出帖子为 Markdown 文件
   */
  const handleExport = async () => {
    if (exportMode === "range" && (!startDate || !endDate)) {
      alert("请选择开始时间和结束时间");
      return;
    }

    setExporting(true);
    setExportCount(null);

    try {
      // 构建查询参数
      const params = new URLSearchParams();
      if (exportMode === "range") {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }

      // 获取帖子数据
      const response = await fetch(`/api/posts/export?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "导出失败");
      }

      const posts: Post[] = result.data;
      setExportCount(posts.length);

      if (posts.length === 0) {
        alert("没有找到符合条件的帖子");
        setExporting(false);
        return;
      }

      // 生成 Markdown 内容
      let markdown = "";

      posts.forEach((post, index) => {
        const postDate = new Date(post.createdAt);
        // 格式化时间为 YYYY/MM/DD HH:mm:ss
        const year = postDate.getFullYear();
        const month = String(postDate.getMonth() + 1).padStart(2, "0");
        const day = String(postDate.getDate()).padStart(2, "0");
        const hours = String(postDate.getHours()).padStart(2, "0");
        const minutes = String(postDate.getMinutes()).padStart(2, "0");
        const seconds = String(postDate.getSeconds()).padStart(2, "0");
        const dateStr = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;

        const isLastPost = index === posts.length - 1;

        // 开始分隔：--- + 两个换行符
        markdown += `---\n\n`;

        // 紧凑内容块（各部分之间只用一个换行符）
        // 时间
        markdown += `**${dateStr}**\n`;
        
        // 正文
        markdown += `${post.content}\n`;

        // 图片（如果有）
        if (Array.isArray(post.images) && post.images.length > 0) {
          post.images.forEach((url) => {
            markdown += `![图片](${url})\n`;
          });
        }

        // 标签（如果有，用反引号包裹）
        if (Array.isArray(post.tags) && post.tags.length > 0) {
          const tagsStr = post.tags.map((tag) => `\`#${tag}\``).join(" ");
          markdown += `${tagsStr}\n`;
        }

        // 结束分隔：空一行（所有帖子）
        // 注意：内容块最后已经有一个换行符了，所以再加一个换行符就是空一行
        markdown += `\n`;
        
        // 最后一条帖子：在空一行后再加一行 ---
        if (isLastPost) {
          markdown += `---\n`;
        }
      });

      // 创建 Blob 并下载
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `posts-export-${new Date().toISOString().split("T")[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`成功导出 ${posts.length} 条帖子`);
    } catch (error) {
      console.error("Export error:", error);
      alert(error instanceof Error ? error.message : "导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  /**
   * 解析 Markdown 文件，提取帖子数据（包含时间、内容、图片、标签）
   */
  const parseMarkdownFile = (content: string): Array<{ content: string; createdAt: string; images: string[]; tags: string[] }> => {
    const posts: Array<{ content: string; createdAt: string; images: string[]; tags: string[] }> = [];

    // 先统一换行符为 \n（处理 Windows 的 \r\n）
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 移除文件开头的空白字符
    content = content.trim();

    // 使用正则表达式匹配每个帖子块
    // 格式：---\n\n**时间**\n内容（内容到下一个---\n\n或文件结尾）
    // 使用全局匹配，确保匹配所有帖子
    // 注意：最后一条帖子可能以 \n--- 或 --- 结尾
    const postPattern = /---\n\n\*\*(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\*\*\n([\s\S]*?)(?=\n\n---|\n---$|---$|$)/g;
    
    let match;
    let matchCount = 0;
    while ((match = postPattern.exec(content)) !== null) {
      matchCount++;
      const timeStr = match[1];
      let postContent = match[2];

      // 解析时间：YYYY/MM/DD HH:mm:ss
      const [datePart, timePart] = timeStr.split(" ");
      const [year, month, day] = datePart.split("/").map(Number);
      const [hours, minutes, seconds] = timePart.split(":").map(Number);
      const createdAt = new Date(year, month - 1, day, hours, minutes, seconds).toISOString();

      // 清理内容：移除最后的空行和可能的 `---` 结尾
      postContent = postContent.replace(/\n+---\s*$/, "");
      postContent = postContent.replace(/\n+$/, "");

      // 提取图片：匹配 ![图片](URL) 格式
      const imagePattern = /!\[图片\]\(([^\)]+)\)/g;
      const images: string[] = [];
      let imageMatch;
      while ((imageMatch = imagePattern.exec(postContent)) !== null) {
        images.push(imageMatch[1].trim());
      }
      // 从内容中移除图片行（包括前后的换行符）
      postContent = postContent.replace(/\n?!\[图片\]\([^\)]+\)\n?/g, "\n");

      // 提取标签：匹配 `#Tag` 格式（反引号包裹）
      const tagPattern = /`#([^`]+)`/g;
      const tags: string[] = [];
      let tagMatch;
      while ((tagMatch = tagPattern.exec(postContent)) !== null) {
        tags.push(tagMatch[1].trim());
      }
      // 从内容中移除标签行（可能在同一行有多个标签，用空格分隔）
      postContent = postContent.replace(/`#[^`]+`(\s*`#[^`]+`)*\n?/g, "");

      // 清理内容：移除多余的空行
      postContent = postContent.replace(/\n{3,}/g, "\n\n").trim();

      if (postContent.trim() || images.length > 0) {
        posts.push({
          content: postContent.trim(),
          createdAt,
          images,
          tags,
        });
      }
    }

    // 如果正则匹配失败，输出调试信息并使用备用方案
    if (matchCount === 0) {
      console.warn("正则匹配失败，使用备用方案解析");
      console.warn("文件内容前200字符：", content.substring(0, 200).replace(/\n/g, "\\n"));
      console.warn("文件内容后200字符：", content.substring(Math.max(0, content.length - 200)).replace(/\n/g, "\\n"));
    }

    // 如果正则匹配失败（可能格式不完全符合），使用备用方案
    if (posts.length === 0) {
      // 按 `---\n\n` 分割，然后逐个解析
      // 注意：需要处理每个 section 中可能包含多条帖子的情况
      const sections = content.split(/---\n\n/).filter((s) => s.trim());
      
      for (const section of sections) {
        // 检查这个 section 是否包含多条帖子（看是否有多个时间行）
        const timeMatches = [...section.matchAll(/\*\*(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\*\*\n/g)];
        
        if (timeMatches.length === 0) {
          continue;
        }

        // 如果有多条帖子，需要分别处理
        for (let i = 0; i < timeMatches.length; i++) {
          const timeMatch = timeMatches[i];
          const nextTimeMatch = timeMatches[i + 1];
          
          const timeStr = timeMatch[1];
          const [datePart, timePart] = timeStr.split(" ");
          const [year, month, day] = datePart.split("/").map(Number);
          const [hours, minutes, seconds] = timePart.split(":").map(Number);
          const createdAt = new Date(year, month - 1, day, hours, minutes, seconds).toISOString();

          // 提取正文：从当前时间行后到下一个时间行前（或 section 结尾）
          const contentStart = timeMatch.index! + timeMatch[0].length;
          const contentEnd = nextTimeMatch ? nextTimeMatch.index! : section.length;
          let postContent = section.substring(contentStart, contentEnd);

          // 移除最后的 `---` 和空行
          postContent = postContent.replace(/\n+---\s*$/, "");
          postContent = postContent.replace(/\n+$/, "");

          // 提取图片：匹配 ![图片](URL) 格式
          const imagePattern = /!\[图片\]\(([^\)]+)\)/g;
          const images: string[] = [];
          let imageMatch;
          while ((imageMatch = imagePattern.exec(postContent)) !== null) {
            images.push(imageMatch[1].trim());
          }
          // 从内容中移除图片行（包括前后的换行符）
          postContent = postContent.replace(/\n?!\[图片\]\([^\)]+\)\n?/g, "\n");

          // 提取标签：匹配 `#Tag` 格式（反引号包裹）
          const tagPattern = /`#([^`]+)`/g;
          const tags: string[] = [];
          let tagMatch;
          while ((tagMatch = tagPattern.exec(postContent)) !== null) {
            tags.push(tagMatch[1].trim());
          }
          // 从内容中移除标签行
          postContent = postContent.replace(/`#[^`]+`(\s*`#[^`]+`)*\n?/g, "");

          // 清理内容：移除多余的空行
          postContent = postContent.replace(/\n{3,}/g, "\n\n").trim();

          if (postContent.trim() || images.length > 0) {
            posts.push({
              content: postContent.trim(),
              createdAt,
              images,
              tags,
            });
          }
        }
      }
    }

    return posts;
  };

  /**
   * 导入帖子（不清空现有帖子，按时间插入）
   */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 确认操作
    if (
      !confirm(
        "导入将把 Markdown 文件中的帖子添加到现有帖子中，按时间顺序插入。\n\n确定要继续吗？"
      )
    ) {
      e.target.value = "";
      return;
    }

    setImporting(true);

    try {
      // 读取文件内容
      const text = await file.text();

      // 解析 Markdown 文件
      const importedPosts = parseMarkdownFile(text);

      if (importedPosts.length === 0) {
        alert("文件中没有找到有效的帖子数据");
        setImporting(false);
        e.target.value = "";
        return;
      }

      // 批量创建新帖子（使用解析出的时间、内容、图片、标签）
      const createPromises = importedPosts.map((post) =>
        fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: post.content,
            tags: post.tags || [],
            images: post.images || [],
            createdAt: post.createdAt, // 使用解析出的时间
          }),
        })
      );

      const results = await Promise.all(createPromises);
      const failed = results.filter((r) => !r.ok);
      const successCount = importedPosts.length - failed.length;

      if (failed.length > 0) {
        throw new Error(`有 ${failed.length} 条帖子导入失败，成功导入 ${successCount} 条`);
      }

      // 显示详细的导入结果
      alert(`✅ 导入完成！\n\n成功导入：${successCount} 条帖子\n\n帖子已按时间顺序添加到现有帖子中。`);
      
      // 刷新页面以显示新导入的帖子
      window.location.reload();
    } catch (error) {
      console.error("Import error:", error);
      alert(error instanceof Error ? error.message : "导入失败，请重试");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 - 黑色半透明 + 高强度毛玻璃 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* 弹窗主体 - 居中，白色背景，深色阴影，圆角，极细边框 */}
      <div className="relative z-10 bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            设置
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 导出功能 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              导出帖子
            </h3>

            {/* 导出模式选择 */}
            <div className="flex gap-2">
              <button
                onClick={() => setExportMode("all")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  exportMode === "all"
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                所有帖子
              </button>
              <button
                onClick={() => setExportMode("range")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  exportMode === "range"
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                时间范围
              </button>
            </div>

            {/* 时间范围选择 */}
            {exportMode === "range" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                    开始时间
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                    结束时间
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition"
                  />
                </div>
              </div>
            )}

            {/* 导出数量显示 */}
            {exportCount !== null && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                将导出 <span className="font-semibold text-zinc-900 dark:text-zinc-50">{exportCount}</span> 条帖子
              </div>
            )}

            {/* 导出按钮 */}
            <button
              onClick={handleExport}
              disabled={exporting || (exportMode === "range" && (!startDate || !endDate))}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download size={16} />
                  导出为 Markdown
                </>
              )}
            </button>
          </div>

          {/* 导入功能 */}
          <div className="space-y-4 mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              导入帖子
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              导入将把 Markdown 文件中的帖子添加到现有帖子中，按时间顺序插入。支持导入时间、内容、图片和标签。
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".md"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  导入 Markdown 文件
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

