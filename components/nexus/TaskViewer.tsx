"use client";

import { useState, useEffect } from "react";
import { useNexusStore } from "@/lib/store";
import type { Task } from "@/types/nexus";

/**
 * 任务查看器组件
 * 显示任务详情、结果和日志
 */
export function TaskViewer({ task }: { task: Task }) {
  const { updateTask } = useNexusStore();
  const [globalDebug, setGlobalDebug] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formattedTime, setFormattedTime] = useState("");
  const [duration, setDuration] = useState("00:00.00");

  // 格式化运行时长：00:00.00（分:秒.毫秒）
  const formatDuration = (startTime: number, status: Task["status"]) => {
    const now = Date.now();
    const elapsed = now - startTime;
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((elapsed % 1000) / 10); // 只取前两位毫秒
    
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(2, "0")}`;
  };

  // 客户端挂载后格式化时间，避免 hydration 错误
  useEffect(() => {
    setMounted(true);
    setFormattedTime(new Date(task.startTime).toLocaleTimeString());
    setDuration(formatDuration(task.startTime, task.status));
  }, [task.startTime, task.status]);

  // 对于进行中的任务，实时更新运行时长
  useEffect(() => {
    if (task.status === "polling") {
      const interval = setInterval(() => {
        setDuration(formatDuration(task.startTime, task.status));
      }, 100); // 每100ms更新一次，以显示毫秒变化
      
      return () => clearInterval(interval);
    }
  }, [task.startTime, task.status]);

  // 判断是否为视频
  const isVideo = (url: string | null) => {
    if (!url) return false;
    return url.includes(".mp4") || url.includes(".mov");
  };

  // 复制到剪贴板
  const copyToClip = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("已复制");
  };

  // 清空日志
  const handleClearLogs = () => {
    updateTask(task.id, {
      logs: [],
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 结果展示区域 */}
        {task.result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50">
                结果
              </h3>
            </div>
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative group ring-1 ring-zinc-900/5 aspect-video flex items-center justify-center">
              {isVideo(task.result) ? (
                <video
                  src={task.result}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={task.result}
                  alt="Task result"
                  className="w-full h-full object-contain"
                />
              )}
              <a
                href={task.result}
                target="_blank"
                download
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur p-2 rounded-lg text-white transition"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* 任务信息卡片 */}
        <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {task.modelName}
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-1">
                ID: {task.id}
              </p>
            </div>
            <div className="text-right space-y-2">
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                <span>提交时间 </span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                  {mounted ? formattedTime : "--:--:--"}
                </span>
              </div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                <span>运行时长 </span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                  {mounted ? duration : "00:00.00"}
                </span>
              </div>
            </div>
          </div>

          {/* 输入参数 */}
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(task.inputs).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="font-bold text-zinc-500 dark:text-zinc-400 mr-2">
                  {key}:
                </span>
                <span className="text-zinc-800 dark:text-zinc-200 break-all">
                  {typeof value === "string" && value.length > 100 ? (
                    <span
                      className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                      title="点击复制"
                      onClick={() => copyToClip(String(value))}
                    >
                      [长文本]
                    </span>
                  ) : (
                    String(value)
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 日志区域（仿终端样式） */}
        <div className="bg-zinc-900 dark:bg-black rounded-2xl p-5 h-64 text-xs font-mono shadow-inner border border-zinc-800 flex flex-col">
          <div className="flex justify-between text-zinc-500 border-b border-zinc-800 pb-2">
            <span className="font-bold tracking-wider text-zinc-400">LOGS</span>
            {/* 调试模式和清除按钮 */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition">
                <input
                  type="checkbox"
                  checked={globalDebug}
                  onChange={(e) => setGlobalDebug(e.target.checked)}
                  className="rounded bg-zinc-800 dark:bg-zinc-700 border-zinc-600 dark:border-zinc-600 text-zinc-200 focus:ring-0"
                />
                <span className="text-[10px]">调试模式</span>
              </label>
              <button
                onClick={handleClearLogs}
                className="hover:text-white transition text-[10px]"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-2">
            {/* 运行状态提示 */}
            {task.status === "polling" && (
              <div className="text-blue-400 animate-pulse text-[10px]">
                Running...
              </div>
            )}
            {task.status === "stopped" && (
              <div className="text-amber-500 text-[10px]">Terminated</div>
            )}

            {/* 日志列表 */}
            {task.logs.length === 0 ? (
              <div className="text-zinc-500 text-[10px]">暂无日志</div>
            ) : (
              task.logs.map((log, i) => (
                <div key={i} className="flex flex-col space-y-1">
                  <div className="flex space-x-3">
                    <span className="text-zinc-600 dark:text-zinc-500 select-none w-14 shrink-0">
                      {log.time}
                    </span>
                    <span
                      className={
                        log.type === "error"
                          ? "text-red-400"
                          : log.type === "success"
                          ? "text-emerald-400"
                          : log.type === "info"
                          ? "text-zinc-300"
                          : log.type === "debug"
                          ? "text-zinc-500"
                          : log.type === "warning"
                          ? "text-amber-400"
                          : "text-zinc-300"
                      }
                    >
                      {log.msg}
                    </span>
                  </div>
                  {globalDebug && log.detail && (
                    <pre className="ml-16 bg-black/30 text-zinc-500 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {log.detail}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
