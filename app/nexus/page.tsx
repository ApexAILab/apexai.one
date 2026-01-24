"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNexusStore } from "@/lib/store";
import { TaskConfigurator } from "@/components/nexus/TaskConfigurator";
import { TaskViewer } from "@/components/nexus/TaskViewer";
import { TaskList } from "@/components/nexus/TaskList";
import { BatchProcessor } from "@/components/nexus/BatchProcessor";
import { SettingsDialog } from "@/components/nexus/SettingsDialog";
import { Settings, ChevronDown } from "lucide-react";
import type { Task } from "@/types/nexus";

/**
 * 视图模式类型
 */
type ViewMode = "single" | "batch" | "detail";

/**
 * Nexus 主页面
 * 左侧边栏 + 右侧主内容区
 */
export default function NexusPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [resetKey, setResetKey] = useState<number>(0); // 用于触发动画和组件重绘
  const [initialFormData, setInitialFormData] = useState<Record<string, any> | undefined>(undefined); // 用于重新编辑的初始数据
  const { models, tasks, loadConfigFromDB, isConfigLoaded } = useNexusStore();
  const [isLoading, setIsLoading] = useState(false);

  // 页面加载时从数据库加载配置
  useEffect(() => {
    if (!isConfigLoaded && !isLoading) {
      setIsLoading(true);
      loadConfigFromDB()
        .catch((error) => {
          console.error("[Nexus] 加载配置失败:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isConfigLoaded]); // 移除 loadConfigFromDB 依赖，避免无限循环

  // 获取当前选中的任务
  const currentTask = currentTaskId
    ? tasks.find((t) => t.id === currentTaskId)
    : null;

  // 获取当前选中的模型
  const selectedModel = models.find((m) => m.id === selectedModelId);

  // 处理单个任务
  const handleSingleTask = () => {
    setViewMode("single");
    setCurrentTaskId(null); // 清空选中的历史任务
    setInitialFormData(undefined); // 清空初始表单数据
    setResetKey((prev) => prev + 1); // 触发动画和重绘
    // 如果当前没选模型，自动选中第一个
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  };

  // 处理批量任务
  const handleBatchTask = () => {
    setViewMode("batch");
    setCurrentTaskId(null); // 清空选中的历史任务
    setResetKey((prev) => prev + 1); // 触发动画和重绘
    // 如果当前没选模型，自动选中第一个
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  };

  // 处理选择任务
  const handleSelectTask = (taskId: string) => {
    setViewMode("detail");
    setCurrentTaskId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedModelId(task.modelId);
    }
  };

  // 处理打开设置
  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  // 处理重新编辑任务
  const handleReEdit = (task: Task) => {
    // 切换到单个任务模式
    setViewMode("single");
    // 设置选中的模型
    setSelectedModelId(task.modelId);
    // 设置初始表单数据（使用任务保存的 inputs）
    setInitialFormData(task.inputs);
    // 清空当前选中的任务
    setCurrentTaskId(null);
    // 触发动画和重绘
    setResetKey((prev) => prev + 1);
  };

  // 处理任务创建完成（已移除自动跳转功能，提交后停留在当前界面）
  // const handleTaskCreated = (taskId: string) => {
  //   setCurrentTaskId(taskId);
  //   setViewMode("detail");
  // };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* 左侧边栏 */}
      <aside className="w-80 h-screen flex flex-col pt-16 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shrink-0 overflow-hidden">
        {/* 顶部：操作区 */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          {/* 按钮行 */}
          <div className="flex items-center gap-2 mb-3">
            {/* 设置按钮 - 仅图标 */}
            <button
              onClick={handleOpenSettings}
              className="p-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
              aria-label="设置"
            >
              <Settings size={18} />
            </button>
            {/* 单个任务按钮 */}
            <button
              onClick={handleSingleTask}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === "single"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              单个任务
            </button>
            {/* 批量任务按钮 */}
            <button
              onClick={handleBatchTask}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === "batch"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              批量任务
            </button>
          </div>

          {/* 模型选择器 */}
          <div className="relative">
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition"
            >
              <option value="">Select a Model...</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none"
            />
          </div>
        </div>

        {/* 中间：历史任务列表 */}
        <div className="flex-1 overflow-y-auto p-3">
          <TaskList
            tasks={tasks}
            currentTaskId={currentTaskId}
            onSelectTask={handleSelectTask}
          />
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden pt-16">
        <AnimatePresence mode="wait">
          {viewMode === "single" && (
            <motion.div
              key={`single-${resetKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <TaskConfigurator
                selectedModelId={selectedModelId}
                initialFormData={initialFormData}
                onTaskSubmitted={() => setInitialFormData(undefined)} // 提交成功后清空初始数据
                // 不传递 onTaskCreated，提交后不跳转，停留在当前界面
              />
            </motion.div>
          )}
          {viewMode === "batch" && (
            <motion.div
              key={`batch-${resetKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <BatchProcessor selectedModelId={selectedModelId} />
            </motion.div>
          )}
          {viewMode === "detail" && currentTask && (
            <motion.div
              key={`detail-${currentTask.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <TaskViewer 
                task={currentTask} 
                onReEdit={handleReEdit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 设置弹窗 */}
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
