"use client";

import { useNexusStore } from "@/lib/store";
import { ChevronDown } from "lucide-react";

/**
 * 模型选择器组件
 * 显示下拉框选择当前使用的模型
 */
export function ModelSelector({
  selectedModelId,
  onSelectModel,
}: {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}) {
  const { models } = useNexusStore();

  return (
    <div className="relative">
      <select
        value={selectedModelId}
        onChange={(e) => onSelectModel(e.target.value)}
        className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition"
      >
        <option value="" disabled>
          -- 请选择模型 --
        </option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={20}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
      />
      {models.length === 0 && (
        <p className="mt-2 text-xs text-red-500">
          暂无模型，请在设置中添加
        </p>
      )}
    </div>
  );
}
