"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Download, Music2, Loader2, Scissors, Upload, Settings2, 
  FileVideo, ImageIcon, Trash2, CheckCircle2, AlertCircle, Plus, X, Clock, MousePointer
} from "lucide-react";

// ==================== 类型定义 ====================

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

type SceneDetectStatus = "idle" | "loading" | "extracting" | "detecting" | "done" | "error";

interface SceneInfo {
  index: number;
  frameNumber: number;
  timestamp: number;
  imageBlob: Blob;
}

// 手动拆解的锚点类型
interface Anchor {
  id: string;
  timestamp: number;
}

// ==================== 动画配置 ====================

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const tabVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

// ==================== 主组件 ====================

export default function StreamPage() {
  // Tab 状态：download = 视频下载, auto = 视频自动拆解, manual = 视频手动拆解
  const [activeTab, setActiveTab] = useState<"download" | "auto" | "manual">("download");

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* 顶部标题 + Tab 切换 */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          {/* 标题 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
              <Play size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">StreamDeck</h1>
          </div>

          {/* Tab 切换按钮 */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
            <button
              onClick={() => setActiveTab("download")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                activeTab === "download"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Download size={14} />
              视频下载
            </button>
            <button
              onClick={() => setActiveTab("auto")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                activeTab === "auto"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Scissors size={14} />
              自动拆解
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                activeTab === "manual"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <MousePointer size={14} />
              手动拆解
            </button>
          </div>
        </motion.div>

        {/* Tab 内容区域 */}
        <AnimatePresence mode="wait">
          {activeTab === "download" && (
            <motion.div
              key="download"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <VideoDownloadTab />
            </motion.div>
          )}
          {activeTab === "auto" && (
            <motion.div
              key="auto"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <AutoSceneDetectTab />
            </motion.div>
          )}
          {activeTab === "manual" && (
            <motion.div
              key="manual"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ManualSceneDetectTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==================== 视频下载 Tab ====================

function VideoDownloadTab() {
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
    <div className="space-y-6">
      {/* 输入区域 */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-sm space-y-4"
      >
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
  );
}

// ==================== 视频自动拆解 Tab ====================

function AutoSceneDetectTab() {
  // 文件上传相关
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // 参数配置
  const [threshold, setThreshold] = useState(20);
  const [minSceneLen, setMinSceneLen] = useState(0.6);
  const [frameOffset, setFrameOffset] = useState(0.15); // 首帧偏移量（秒）
  const [showSettings, setShowSettings] = useState(false);

  // 处理状态
  const [status, setStatus] = useState<SceneDetectStatus>("idle");
  const [progress, setProgress] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState("");
  const [scenes, setScenes] = useState<SceneInfo[]>([]);

  // 清理视频 URL
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // 处理文件选择
  const handleFileSelect = (file: File) => {
    const allowedExtensions = [".mp4", ".mov", ".avi", ".webm", ".mkv"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    
    if (!allowedExtensions.includes(ext)) {
      setError("不支持的视频格式，请上传 MP4、MOV、AVI、WebM 或 MKV 格式");
      return;
    }

    // 清理之前的 URL
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setVideoUrl(url);
    setError("");
    setStatus("idle");
    setScenes([]);
  };

  // 处理拖拽
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // 处理文件输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  // 计算两帧之间的差异（简单的像素差异算法）
  const calculateFrameDifference = (
    imageData1: ImageData,
    imageData2: ImageData
  ): number => {
    const data1 = imageData1.data;
    const data2 = imageData2.data;
    let diff = 0;
    const pixelCount = data1.length / 4;

    for (let i = 0; i < data1.length; i += 4) {
      // 计算 RGB 差异（忽略 Alpha 通道）
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
      diff += (rDiff + gDiff + bDiff) / 3;
    }

    // 返回平均差异百分比 (0-100)
    return (diff / pixelCount / 255) * 100;
  };

  // 从 Canvas 获取图片 Blob
  const getCanvasBlob = (canvas: HTMLCanvasElement, quality: number = 0.92): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("无法生成图片"));
          }
        },
        "image/jpeg",
        quality
      );
    });
  };

  // 场景检测核心逻辑
  const detectScenes = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !videoUrl) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    setStatus("extracting");
    setProgress("正在加载视频...");
    setProgressPercent(0);

    try {
      // 等待视频元数据加载
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 1) {
          resolve();
        } else {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("视频加载失败"));
        }
      });

      const duration = video.duration;
      const fps = 10; // 采样帧率（每秒检测 10 帧，平衡速度和精度）
      const frameInterval = 1 / fps;
      const totalFrames = Math.floor(duration * fps);

      // 设置 Canvas 尺寸（使用较小尺寸以提高速度）
      const scale = Math.min(1, 320 / video.videoWidth);
      canvas.width = Math.floor(video.videoWidth * scale);
      canvas.height = Math.floor(video.videoHeight * scale);

      setStatus("detecting");
      setProgress(`正在分析场景 (0/${totalFrames})...`);

      const detectedScenes: SceneInfo[] = [];
      let previousImageData: ImageData | null = null;
      let lastSceneTime = 0;
      let frameIndex = 0;

      // 逐帧分析
      for (let time = 0; time < duration; time += frameInterval) {
        frameIndex++;
        
        // 更新进度
        const percent = Math.floor((time / duration) * 100);
        setProgressPercent(percent);
        setProgress(`正在分析场景 (${frameIndex}/${totalFrames})...`);

        // 跳转到指定时间
        video.currentTime = time;
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });

        // 绘制当前帧到 Canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 如果有上一帧，计算差异
        if (previousImageData) {
          const diff = calculateFrameDifference(previousImageData, currentImageData);
          
          // 如果差异超过阈值，且距离上一个场景足够远，则认为是新场景
          if (diff > threshold && (time - lastSceneTime) >= minSceneLen) {
            // 智能首帧：偏移指定时间避免转场残影
            const captureTime = Math.min(time + frameOffset, duration - 0.1);
            
            video.currentTime = captureTime;
            await new Promise<void>((resolve) => {
              video.onseeked = () => resolve();
            });

            // 使用原始尺寸捕获高清图片
            const hdCanvas = document.createElement("canvas");
            hdCanvas.width = video.videoWidth;
            hdCanvas.height = video.videoHeight;
            const hdCtx = hdCanvas.getContext("2d");
            if (hdCtx) {
              hdCtx.drawImage(video, 0, 0);
              const imageBlob = await getCanvasBlob(hdCanvas);
              
              detectedScenes.push({
                index: detectedScenes.length + 1,
                frameNumber: frameIndex,
                timestamp: captureTime,
                imageBlob,
              });
            }

            lastSceneTime = time;

            // 恢复到当前分析位置
            video.currentTime = time;
            await new Promise<void>((resolve) => {
              video.onseeked = () => resolve();
            });
          }
        } else {
          // 第一帧总是作为第一个场景
          const hdCanvas = document.createElement("canvas");
          hdCanvas.width = video.videoWidth;
          hdCanvas.height = video.videoHeight;
          const hdCtx = hdCanvas.getContext("2d");
          if (hdCtx) {
            hdCtx.drawImage(video, 0, 0);
            const imageBlob = await getCanvasBlob(hdCanvas);
            
            detectedScenes.push({
              index: 1,
              frameNumber: 1,
              timestamp: 0,
              imageBlob,
            });
          }
          lastSceneTime = 0;
        }

        previousImageData = currentImageData;
      }

      setScenes(detectedScenes);
      setStatus("done");
      setProgress(`成功检测到 ${detectedScenes.length} 个场景`);
      setProgressPercent(100);
    } catch (err) {
      console.error("场景检测错误:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "处理失败，请重试");
    }
  }, [videoUrl, threshold, minSceneLen, frameOffset]);

  // 下载所有场景图片（打包为 ZIP）
  const downloadAllScenes = async () => {
    if (scenes.length === 0) return;

    setProgress("正在打包下载...");
    
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const scene of scenes) {
        const fileName = `${scene.index}.jpg`;
        zip.file(fileName, scene.imageBlob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const baseName = selectedFile?.name.replace(/\.[^.]+$/, "") || "scenes";
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${baseName}_scenes.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("打包下载错误:", err);
      setError("打包下载失败，请重试");
    }
  };

  // 重置状态
  const handleReset = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setSelectedFile(null);
    setVideoUrl(null);
    setStatus("idle");
    setProgress("");
    setProgressPercent(0);
    setError("");
    setScenes([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* 隐藏的视频和 Canvas 元素用于处理 */}
      <video
        ref={videoRef}
        src={videoUrl || undefined}
        className="hidden"
        crossOrigin="anonymous"
        preload="metadata"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* 上传区域 */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-sm space-y-4"
      >
        {/* 功能说明 */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
          <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <Scissors size={16} className="text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">视频自动拆解</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              上传本地视频，自动检测场景切换点，提取每个分镜的首帧图片并打包下载。
              <span className="text-green-600 dark:text-green-400 font-medium">完全在浏览器中处理，无需上传到服务器。</span>
            </p>
          </div>
        </div>

        {/* 参数配置按钮 */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              showSettings
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            <Settings2 size={14} />
            参数配置
          </button>
        </div>

        {/* 参数配置面板 */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-700">
                {/* 检测阈值 */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">检测灵敏度</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{threshold}%</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    数值越低越敏感，检测出的场景越多。默认值 20%
                  </p>
                </div>

                {/* 最小场景长度 */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">最小场景长度</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{minSceneLen}s</span>
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.1"
                    value={minSceneLen}
                    onChange={(e) => setMinSceneLen(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    防止切出太碎的片段，低于此时长的场景会被忽略。默认值 0.6s
                  </p>
                </div>

                {/* 首帧偏移量 */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">首帧偏移</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{(frameOffset * 1000).toFixed(0)}ms</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={frameOffset}
                    onChange={(e) => setFrameOffset(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    场景开始后偏移多少再截图，避免转场残影。默认值 150ms
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 文件上传区域 */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800"
              : selectedFile
              ? "border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50"
              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,.avi,.webm,.mkv,video/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                <FileVideo size={28} className="text-zinc-600 dark:text-zinc-300" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
              >
                <Trash2 size={12} />
                移除文件
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Upload size={28} className="text-zinc-400 dark:text-zinc-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  拖拽视频文件到这里，或点击选择
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  支持 MP4、MOV、AVI、WebM、MKV 格式
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 进度条 */}
        {(status === "extracting" || status === "detecting") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>{progress}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <motion.div
                className="h-full bg-zinc-900 dark:bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          {status === "done" && (
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition text-sm text-zinc-700 dark:text-zinc-200"
            >
              处理新视频
            </button>
          )}
          <button
            onClick={detectScenes}
            disabled={!selectedFile || status === "extracting" || status === "detecting"}
            className="px-6 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "extracting" || status === "detecting" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Scissors size={16} />
                开始拆解
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* 处理结果 */}
      <AnimatePresence>
        {status === "done" && scenes.length > 0 && (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-sm space-y-4"
          >
            {/* 结果头部 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">处理完成</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    成功检测到 <span className="font-medium text-zinc-700 dark:text-zinc-300">{scenes.length}</span> 个场景
                  </p>
                </div>
              </div>
              <button
                onClick={downloadAllScenes}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center gap-2 text-sm font-medium"
              >
                <Download size={16} />
                下载全部 (ZIP)
              </button>
            </div>

            {/* 场景预览网格 - 自适应图片比例，均匀分布 */}
            <div 
              className="grid gap-3"
              style={{ 
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))"
              }}
            >
              {scenes.map((scene) => (
                <div
                  key={scene.index}
                  className="group relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                >
                  <img
                    src={URL.createObjectURL(scene.imageBlob)}
                    alt={`场景 ${scene.index}`}
                    className="w-full h-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white transform translate-y-full group-hover:translate-y-0 transition-transform">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{scene.index}.jpg</span>
                      <span className="text-white/70">{formatTime(scene.timestamp)}</span>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-xs font-medium">
                    {scene.index}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 使用说明 */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6"
      >
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">使用说明</h3>
        <ul className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-medium">1</span>
            <span>上传本地视频文件（支持 MP4、MOV、AVI、WebM、MKV 格式）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-medium">2</span>
            <span>可选：调整参数配置以适应不同类型的视频（快节奏视频可降低灵敏度阈值）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-medium">3</span>
            <span>点击「开始拆解」，系统会自动检测场景并提取首帧图片</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-medium">4</span>
            <span>处理完成后可预览所有场景，点击「下载全部」获取 ZIP 压缩包（图片命名为 1.jpg, 2.jpg...）</span>
          </li>
        </ul>
        <div className="mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-400">
          <span className="font-medium">🔒 隐私保护：</span>
          所有处理完全在你的浏览器中进行，视频不会上传到任何服务器。
        </div>
      </motion.div>
    </div>
  );
}

// ==================== 视频手动拆解 Tab ====================

function ManualSceneDetectTab() {
  // 文件上传相关
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 锚点管理
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [timeInput, setTimeInput] = useState("");

  // 提取状态
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedImages, setExtractedImages] = useState<{ index: number; timestamp: number; blob: Blob }[]>([]);
  const [error, setError] = useState("");

  // 清理视频 URL
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // 视频时间更新
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoUrl]);

  // 处理文件选择
  const handleFileSelect = (file: File) => {
    const allowedExtensions = [".mp4", ".mov", ".avi", ".webm", ".mkv"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    
    if (!allowedExtensions.includes(ext)) {
      setError("不支持的视频格式，请上传 MP4、MOV、AVI、WebM 或 MKV 格式");
      return;
    }

    // 清理之前的状态
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setVideoUrl(url);
    setError("");
    setAnchors([]);
    setExtractedImages([]);
    setCurrentTime(0);
    setVideoDuration(0);
  };

  // 处理拖拽
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // 处理文件输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  // 格式化时间显示 (mm:ss.ms)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  // 格式化时间显示 (mm:ss)
  const formatTimeShort = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // 解析时间输入 (支持 mm:ss 或 mm:ss.ms 或纯秒数)
  const parseTimeInput = (input: string): number | null => {
    const trimmed = input.trim();
    
    // 纯数字（秒）
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    
    // mm:ss 或 mm:ss.ms 格式
    const match = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d{1,2}))?$/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms = match[3] ? parseInt(match[3].padEnd(2, "0")) / 100 : 0;
      return minutes * 60 + seconds + ms;
    }
    
    return null;
  };

  // 添加当前时间为锚点
  const addCurrentTimeAsAnchor = () => {
    if (!videoRef.current) return;
    
    const time = videoRef.current.currentTime;
    
    // 检查是否已存在相同时间的锚点
    if (anchors.some(a => Math.abs(a.timestamp - time) < 0.1)) {
      setError("该时间点附近已存在锚点");
      setTimeout(() => setError(""), 2000);
      return;
    }
    
    const newAnchor: Anchor = {
      id: Date.now().toString(),
      timestamp: time,
    };
    
    setAnchors(prev => [...prev, newAnchor].sort((a, b) => a.timestamp - b.timestamp));
  };

  // 通过输入添加锚点
  const addAnchorFromInput = () => {
    const time = parseTimeInput(timeInput);
    
    if (time === null) {
      setError("请输入有效的时间格式（如 1:30 或 90.5）");
      setTimeout(() => setError(""), 2000);
      return;
    }
    
    if (time < 0 || time > videoDuration) {
      setError(`时间必须在 0 到 ${formatTimeShort(videoDuration)} 之间`);
      setTimeout(() => setError(""), 2000);
      return;
    }
    
    // 检查是否已存在相同时间的锚点
    if (anchors.some(a => Math.abs(a.timestamp - time) < 0.1)) {
      setError("该时间点附近已存在锚点");
      setTimeout(() => setError(""), 2000);
      return;
    }
    
    const newAnchor: Anchor = {
      id: Date.now().toString(),
      timestamp: time,
    };
    
    setAnchors(prev => [...prev, newAnchor].sort((a, b) => a.timestamp - b.timestamp));
    setTimeInput("");
  };

  // 删除锚点
  const removeAnchor = (id: string) => {
    setAnchors(prev => prev.filter(a => a.id !== id));
  };

  // 跳转到锚点时间
  const seekToAnchor = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  };

  // 进度条拖动
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // 播放/暂停
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  // 从 Canvas 获取图片 Blob
  const getCanvasBlob = (canvas: HTMLCanvasElement, quality: number = 0.92): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("无法生成图片"));
          }
        },
        "image/jpeg",
        quality
      );
    });
  };

  // 提取锚点图片
  const extractImages = async () => {
    if (!videoRef.current || anchors.length === 0) return;
    
    setIsExtracting(true);
    setError("");
    
    const video = videoRef.current;
    const sortedAnchors = [...anchors].sort((a, b) => a.timestamp - b.timestamp);
    const images: { index: number; timestamp: number; blob: Blob }[] = [];
    
    try {
      for (let i = 0; i < sortedAnchors.length; i++) {
        const anchor = sortedAnchors[i];
        
        // 跳转到指定时间
        video.currentTime = anchor.timestamp;
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });
        
        // 创建 Canvas 并绘制帧
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const blob = await getCanvasBlob(canvas);
          images.push({
            index: i + 1,
            timestamp: anchor.timestamp,
            blob,
          });
        }
      }
      
      setExtractedImages(images);
    } catch (err) {
      console.error("提取图片失败:", err);
      setError("提取图片失败，请重试");
    } finally {
      setIsExtracting(false);
    }
  };

  // 下载所有图片（打包为 ZIP）
  const downloadAllImages = async () => {
    if (extractedImages.length === 0) return;
    
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const img of extractedImages) {
        const fileName = `${img.index}.jpg`;
        zip.file(fileName, img.blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const baseName = selectedFile?.name.replace(/\.[^.]+$/, "") || "frames";
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${baseName}_frames.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("打包下载错误:", err);
      setError("打包下载失败，请重试");
    }
  };

  // 重置状态
  const handleReset = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setSelectedFile(null);
    setVideoUrl(null);
    setAnchors([]);
    setExtractedImages([]);
    setError("");
    setCurrentTime(0);
    setVideoDuration(0);
    setTimeInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-sm space-y-4"
      >
        {/* 功能说明 */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
          <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <MousePointer size={16} className="text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">视频手动拆解</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              上传本地视频，手动选择需要截取的时间点，提取对应帧图片并打包下载。
              <span className="text-green-600 dark:text-green-400 font-medium">完全在浏览器中处理，无需上传到服务器。</span>
            </p>
          </div>
        </div>

        {!videoUrl ? (
          /* 文件上传区域 */
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800"
                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.webm,.mkv,video/*"
              onChange={handleInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Upload size={28} className="text-zinc-400 dark:text-zinc-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  拖拽视频文件到这里，或点击选择
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  支持 MP4、MOV、AVI、WebM、MKV 格式
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* 视频播放器和控制区域 */
          <div className="space-y-4">
            {/* 文件信息和移除按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <FileVideo size={20} className="text-zinc-600 dark:text-zinc-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-xs">
                    {selectedFile?.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedFile && formatFileSize(selectedFile.size)} · {formatTimeShort(videoDuration)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
              >
                <Trash2 size={12} />
                移除
              </button>
            </div>

            {/* 视频播放器 */}
            <div className="rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full max-h-[400px] object-contain"
                onClick={togglePlayPause}
              />
            </div>

            {/* 进度条和时间 */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={videoDuration || 100}
                  step="0.01"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
                />
                {/* 锚点标记 */}
                {anchors.map((anchor) => (
                  <div
                    key={anchor.id}
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 cursor-pointer hover:scale-125 transition-transform"
                    style={{ left: `${(anchor.timestamp / videoDuration) * 100}%`, marginLeft: "-6px" }}
                    onClick={() => seekToAnchor(anchor.timestamp)}
                    title={formatTime(anchor.timestamp)}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTimeShort(videoDuration)}</span>
              </div>
            </div>

            {/* 播放控制和添加锚点 */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* 播放/暂停按钮 */}
              <button
                onClick={togglePlayPause}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-2 text-sm"
              >
                {isPlaying ? (
                  <>
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="flex gap-0.5">
                        <div className="w-1 h-3 bg-current rounded-sm" />
                        <div className="w-1 h-3 bg-current rounded-sm" />
                      </div>
                    </div>
                    暂停
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    播放
                  </>
                )}
              </button>

              {/* 添加当前时间为锚点 */}
              <button
                onClick={addCurrentTimeAsAnchor}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus size={16} />
                添加当前时间 ({formatTime(currentTime)})
              </button>

              {/* 时间输入 */}
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAnchorFromInput()}
                    placeholder="输入时间 (如 1:30 或 90.5)"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50"
                  />
                </div>
                <button
                  onClick={addAnchorFromInput}
                  disabled={!timeInput.trim()}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition text-sm disabled:opacity-50"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </motion.div>

      {/* 锚点列表 */}
      {videoUrl && (
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              时间锚点 ({anchors.length})
            </h3>
            {anchors.length > 0 && (
              <button
                onClick={() => setAnchors([])}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
              >
                清空全部
              </button>
            )}
          </div>

          {anchors.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
              暂无锚点，请通过拖动进度条或输入时间来添加
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {anchors.map((anchor, index) => (
                <div
                  key={anchor.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 group"
                >
                  <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                    {index + 1}
                  </span>
                  <button
                    onClick={() => seekToAnchor(anchor.timestamp)}
                    className="text-sm text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition"
                  >
                    {formatTime(anchor.timestamp)}
                  </button>
                  <button
                    onClick={() => removeAnchor(anchor.id)}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 提取按钮 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={extractImages}
              disabled={anchors.length === 0 || isExtracting}
              className="px-6 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtracting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  提取中...
                </>
              ) : (
                <>
                  <ImageIcon size={16} />
                  提取图片 ({anchors.length} 张)
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* 提取结果 */}
      <AnimatePresence>
        {extractedImages.length > 0 && (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-sm space-y-4"
          >
            {/* 结果头部 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">提取完成</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    成功提取 <span className="font-medium text-zinc-700 dark:text-zinc-300">{extractedImages.length}</span> 张图片
                  </p>
                </div>
              </div>
              <button
                onClick={downloadAllImages}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition flex items-center gap-2 text-sm font-medium"
              >
                <Download size={16} />
                下载全部 (ZIP)
              </button>
            </div>

            {/* 图片预览网格 */}
            <div 
              className="grid gap-3"
              style={{ 
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))"
              }}
            >
              {extractedImages.map((img) => (
                <div
                  key={img.index}
                  className="group relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                >
                  <img
                    src={URL.createObjectURL(img.blob)}
                    alt={`帧 ${img.index}`}
                    className="w-full h-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white transform translate-y-full group-hover:translate-y-0 transition-transform">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{img.index}.jpg</span>
                      <span className="text-white/70">{formatTime(img.timestamp)}</span>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-xs font-medium">
                    {img.index}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 使用说明 */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6"
      >
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">使用说明</h3>
        <ul className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-medium">1</span>
            <span>上传本地视频文件（支持 MP4、MOV、AVI、WebM、MKV 格式）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-medium">2</span>
            <span>通过两种方式添加时间锚点：拖动进度条后点击「添加当前时间」，或直接输入时间（支持 mm:ss 或秒数格式）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-medium">3</span>
            <span>点击锚点可以跳转到对应时间，点击 × 可以删除锚点</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-[10px] font-medium">4</span>
            <span>添加完所有锚点后，点击「提取图片」，然后下载 ZIP 压缩包（图片命名为 1.jpg, 2.jpg...）</span>
          </li>
        </ul>
        <div className="mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-400">
          <span className="font-medium">🔒 隐私保护：</span>
          所有处理完全在你的浏览器中进行，视频不会上传到任何服务器。
        </div>
      </motion.div>
    </div>
  );
}
