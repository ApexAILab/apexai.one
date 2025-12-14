"use client";

import { useState, useEffect } from "react";
import { useNexusStore } from "@/lib/store";
import type { Task } from "@/types/nexus";
import { CheckCircle2, XCircle, Loader2, StopCircle, Trash2 } from "lucide-react";

/**
 * 任务列表组件
 * 显示历史任务列表，每个任务是一个 Bento Card
 */
export function TaskList({
  tasks,
  currentTaskId,
  onSelectTask,
}: {
  tasks: Task[];
  currentTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}) {
  const { deleteTask } = useNexusStore();
  const [mounted, setMounted] = useState(false);
  const [formattedTimes, setFormattedTimes] = useState<Record<string, string>>({});

  // 客户端挂载后格式化时间，避免 hydration 错误
  useEffect(() => {
    setMounted(true);
    const times: Record<string, string> = {};
    tasks.forEach((task) => {
      times[task.id] = new Date(task.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    });
    setFormattedTimes(times);
  }, [tasks]);

  // 格式化时间
  const formatTime = (timestamp: number) => {
    if (!mounted) return "--:--";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 获取状态图标
  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "polling":
        return <Loader2 size={14} className="animate-spin text-blue-400" />;
      case "success":
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "failed":
        return <XCircle size={14} className="text-red-500" />;
      case "stopped":
        return <StopCircle size={14} className="text-amber-500" />;
      default:
        return null;
    }
  };

  // 获取状态文本
  const getStatusText = (status: Task["status"]) => {
    switch (status) {
      case "polling":
        return "进行中";
      case "success":
        return "完成";
      case "failed":
        return "失败";
      case "stopped":
        return "已终止";
      default:
        return "";
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400 dark:text-zinc-600">
        <p className="text-sm">暂无历史任务</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onSelectTask(task.id)}
          className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
            currentTaskId === task.id
              ? "bg-zinc-900 dark:bg-zinc-800 border-zinc-700 dark:border-zinc-700 text-white shadow-lg"
              : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm"
          }`}
        >
          {/* 头部：模型名称和时间 */}
          <div className="flex justify-between items-start mb-2">
            <span
              className={`text-xs font-bold truncate max-w-[70%] ${
                currentTaskId === task.id
                  ? "text-white"
                  : "text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {task.modelName}
            </span>
            <span
              className={`text-[10px] ${
                currentTaskId === task.id
                  ? "text-zinc-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {formatTime(task.startTime)}
            </span>
          </div>

          {/* 摘要 */}
          <div
            className={`text-xs truncate mb-2 font-mono ${
              currentTaskId === task.id
                ? "text-zinc-300"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {task.summary || "无标题"}
          </div>

          {/* 状态 */}
          <div className="flex items-center gap-1.5">
            {getStatusIcon(task.status)}
            <span
              className={`text-[10px] ${
                currentTaskId === task.id
                  ? "text-zinc-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {getStatusText(task.status)}
            </span>
          </div>

          {/* 删除按钮（悬停时显示） */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("确认删除此任务？")) {
                deleteTask(task.id);
              }
            }}
            className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 hover:text-red-500 transition text-zinc-400 dark:text-zinc-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
