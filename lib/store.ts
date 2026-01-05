"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Credential, Model, Task } from "@/types/nexus";

/**
 * Nexus 状态管理接口
 */
interface NexusStore {
  // 状态
  credentials: Credential[];
  models: Model[];
  tasks: Task[];
  isConfigLoaded: boolean; // 配置是否已从数据库加载

  // 配置加载和保存
  loadConfigFromDB: () => Promise<void>;
  saveConfigToDB: () => Promise<void>;

  // Credential Actions（会自动保存到数据库）
  addCredential: (credential: Credential) => void;
  updateCredential: (id: string, updates: Partial<Credential>) => void;
  deleteCredential: (id: string) => void;

  // Model Actions（会自动保存到数据库）
  addModel: (model: Model) => void;
  updateModel: (id: string, updates: Partial<Model>) => void;
  deleteModel: (id: string) => void;

  // Task Actions（仅保存在本地，不保存到数据库）
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  clearTasks: () => void;
}

/**
 * 保存配置到数据库的辅助函数
 */
async function saveConfig(credentials: Credential[], models: Model[]) {
  try {
    const response = await fetch("/api/nexus/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credentials,
        models,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "保存配置失败");
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "保存配置失败");
    }

    return result.data;
  } catch (error) {
    console.error("[Store] 保存配置到数据库失败:", error);
    throw error;
  }
}

/**
 * 从数据库加载配置的辅助函数
 */
async function loadConfig(): Promise<{
  credentials: Credential[];
  models: Model[];
}> {
  try {
    const response = await fetch("/api/nexus/config");

    if (!response.ok) {
      if (response.status === 401) {
        // 未登录，返回空配置
        return { credentials: [], models: [] };
      }
      const error = await response.json();
      throw new Error(error.error || "加载配置失败");
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "加载配置失败");
    }

    return result.data;
  } catch (error) {
    console.error("[Store] 从数据库加载配置失败:", error);
    // 加载失败时返回空配置，避免阻塞应用
    return { credentials: [], models: [] };
  }
}

/**
 * Nexus 全局状态仓库
 * - credentials 和 models：从数据库加载和保存，不持久化到 localStorage
 * - tasks：仅保存在 localStorage，不保存到数据库
 */
export const useNexusStore = create<NexusStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      credentials: [],
      models: [],
      tasks: [],
      isConfigLoaded: false,

      // 从数据库加载配置
      loadConfigFromDB: async () => {
        if (get().isConfigLoaded) {
          return; // 避免重复加载
        }

        try {
          const config = await loadConfig();
          set({
            credentials: config.credentials,
            models: config.models,
            isConfigLoaded: true,
          });
        } catch (error) {
          console.error("[Store] 加载配置失败:", error);
          // 即使失败也标记为已加载，避免无限重试
          set({
            isConfigLoaded: true,
          });
        }
      },

      // 保存配置到数据库
      saveConfigToDB: async () => {
        const { credentials, models } = get();
        try {
          const savedConfig = await saveConfig(credentials, models);
          // 更新为服务器返回的配置（包含新的 ID）
          set({
            credentials: savedConfig.credentials,
            models: savedConfig.models,
          });
        } catch (error) {
          console.error("[Store] 保存配置失败:", error);
          // 保存失败时不更新状态，保持本地状态
        }
      },

      // Credential Actions（仅更新本地状态，不自动保存到数据库）
      addCredential: (credential) => {
        set((state) => ({
          credentials: [...state.credentials, credential],
        }));
      },

      updateCredential: (id, updates) => {
        set((state) => ({
          credentials: state.credentials.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteCredential: (id) => {
        set((state) => ({
          credentials: state.credentials.filter((c) => c.id !== id),
          // 同时删除关联的模型
          models: state.models.filter((m) => m.credentialId !== id),
        }));
      },

      // Model Actions（仅更新本地状态，不自动保存到数据库）
      addModel: (model) => {
        set((state) => ({
          models: [...state.models, model],
        }));
      },

      updateModel: (id, updates) => {
        set((state) => ({
          models: state.models.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      deleteModel: (id) => {
        set((state) => ({
          models: state.models.filter((m) => m.id !== id),
        }));
      },

      // Task Actions（仅保存在本地，不保存到数据库）
      addTask: (task) =>
        set((state) => ({
          tasks: [task, ...state.tasks], // 新任务添加到最前面
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      clearTasks: () =>
        set(() => ({
          tasks: [],
        })),
    }),
    {
      name: "nexus-tasks-data", // 只持久化 tasks，不持久化 credentials 和 models
      version: 1,
      // 只持久化 tasks 字段
      partialize: (state) => ({
        tasks: state.tasks,
      }),
    }
  )
);
