"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Download, Music2, Loader2 } from "lucide-react";

type MediaItem = {
  id: string;
  url: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  videoOptions: { itag: number; label: string }[];
  audioOptions: { itag: number; label: string }[];
  selectedVideo?: number;
  selectedAudio?: number;
};

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function StreamPage() {
  const [inputUrls, setInputUrls] = useState("");
  const [proxy, setProxy] = useState("http://127.0.0.1:7897");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const parseUrls = () => {
    const lines = inputUrls
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const unique = Array.from(new Set(lines));
    return unique;
  };

  const handleParse = async () => {
    const urls = parseUrls();
    if (urls.length === 0) {
      alert("请先输入至少一个 YouTube 链接");
      return;
    }
    setLoading(true);
    try {
      const results: MediaItem[] = [];
      for (const url of urls) {
        const res = await fetch("/api/stream/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, proxy }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        results.push({
          id: data.id,
          url,
          title: data.title,
          author: data.author,
          duration: data.duration,
          thumbnail: data.thumbnail,
          videoOptions: data.videoOptions?.slice(0, 5) || [],
          audioOptions: data.audioOptions?.slice(0, 5) || [],
        });
      }
      setItems(results);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleDownload = async (item: MediaItem, type: "video" | "audio", itag?: number) => {
    const selectedItag =
      itag ||
      (type === "video"
        ? item.selectedVideo || item.videoOptions[0]?.itag
        : item.selectedAudio || item.audioOptions[0]?.itag);

    setDownloadingId(item.id + type + (selectedItag || ""));
    try {
      const params = new URLSearchParams({
        url: item.url,
        type,
      });
      if (selectedItag) params.set("itag", String(selectedItag));
      if (proxy) params.set("proxy", proxy);

      const res = await fetch(`/api/stream/download?${params.toString()}`);
      if (!res.ok) {
        alert("下载失败");
        return;
      }
      const blob = await res.blob();
      const ext = type === "audio" ? "mp3" : "mp4";
      const name = `${item.title || "download"}.${ext}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name.replace(/[\\/:*?"<>|]+/g, "_");
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      alert("下载失败，请重试");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* 顶部介绍 */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur p-8 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-md">
              <Play size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">StreamDeck</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Paste YouTube URLs to fetch info and download video/audio locally.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* HTTP 代理在链接输入框上方 */}
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">HTTP 代理（可选）</span>
              <input
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                placeholder="例如 http://127.0.0.1:7897"
                className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
              />
            </div>

            <textarea
              value={inputUrls}
              onChange={(e) => setInputUrls(e.target.value)}
              rows={3}
              placeholder="每行一个 YouTube 链接，支持粘贴多行..."
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition resize-none"
            />

            <div className="flex flex-col gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <span className="text-[11px] md:text-xs">
                  支持多行批量解析，无需 API Key，直接本地下载
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleParse}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                    {loading ? "解析中..." : "解析链接"}
                  </button>
                  <button
                    onClick={() => {
                      setInputUrls("");
                      setItems([]);
                    }}
                    className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-sm text-zinc-700 dark:text-zinc-200"
                  >
                    清空
                  </button>
                  <button
                    onClick={async () => {
                      for (const item of items) {
                        await handleDownload(item, "video");
                      }
                    }}
                    disabled={items.length === 0}
                    className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    <Download size={14} />
                    全部下载视频
                  </button>
                  <button
                    onClick={async () => {
                      for (const item of items) {
                        await handleDownload(item, "audio");
                      }
                    }}
                    disabled={items.length === 0}
                    className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    <Music2 size={14} />
                    全部下载音频
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 结果列表 */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="space-y-4"
            >
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  variants={sectionVariants}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 shadow-sm overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    <div className="w-36 h-24 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                      {/* 标题 + 下载控制区 */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2">
                            {item.title}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-2">
                            <span>{item.author}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                            <span>{formatDuration(item.duration)}</span>
                            <span className="hidden md:inline w-1 h-1 rounded-full bg-zinc-300" />
                            <span className="text-[11px] text-zinc-400 truncate md:max-w-xs">{item.url}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-72 md:self-center">
                          {/* 视频下载行 */}
                          <div className="flex items-center gap-2">
                            <select
                              value={item.selectedVideo || item.videoOptions[0]?.itag}
                              className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition"
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id ? { ...p, selectedVideo: Number(e.target.value) } : p
                                  )
                                )
                              }
                            >
                              {item.videoOptions.map((opt) => (
                                <option key={opt.itag} value={opt.itag}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() =>
                                handleDownload(
                                  item,
                                  "video",
                                  item.selectedVideo || item.videoOptions[0]?.itag || undefined
                                )
                              }
                              disabled={downloadingId === item.id + "video"}
                              className="px-3 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs md:text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {downloadingId === item.id + "video" ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                              视频
                            </button>
                          </div>
                          {/* 音频下载行 */}
                          <div className="flex items-center gap-2">
                            <select
                              value={item.selectedAudio || item.audioOptions[0]?.itag}
                              className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition"
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id ? { ...p, selectedAudio: Number(e.target.value) } : p
                                  )
                                )
                              }
                            >
                              {item.audioOptions.map((opt) => (
                                <option key={opt.itag} value={opt.itag}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() =>
                                handleDownload(
                                  item,
                                  "audio",
                                  item.selectedAudio || item.audioOptions[0]?.itag || undefined
                                )
                              }
                              disabled={downloadingId === item.id + "audio"}
                              className="px-3 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs md:text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {downloadingId === item.id + "audio" ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                              音频
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* URL 行（移动端单独一行展示） */}
                      <div className="md:hidden text-[11px] text-zinc-400 truncate">{item.url}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
