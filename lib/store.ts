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

  // Credential Actions
  addCredential: (credential: Credential) => void;
  updateCredential: (id: string, updates: Partial<Credential>) => void;
  deleteCredential: (id: string) => void;

  // Model Actions
  addModel: (model: Model) => void;
  updateModel: (id: string, updates: Partial<Model>) => void;
  deleteModel: (id: string) => void;

  // Task Actions
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  clearTasks: () => void;
}

/**
 * Nexus 全局状态仓库
 * 使用 zustand 管理状态，并持久化到 localStorage
 */
export const useNexusStore = create<NexusStore>()(
  persist(
    (set) => ({
      // 初始状态
      credentials: [],
      models: [],
      tasks: [],

      // Credential Actions
      addCredential: (credential) =>
        set((state) => ({
          credentials: [...state.credentials, credential],
        })),

      updateCredential: (id, updates) =>
        set((state) => ({
          credentials: state.credentials.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCredential: (id) =>
        set((state) => ({
          credentials: state.credentials.filter((c) => c.id !== id),
        })),

      // Model Actions
      addModel: (model) =>
        set((state) => ({
          models: [...state.models, model],
        })),

      updateModel: (id, updates) =>
        set((state) => ({
          models: state.models.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      deleteModel: (id) =>
        set((state) => ({
          models: state.models.filter((m) => m.id !== id),
        })),

      // Task Actions
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
      name: "nexus-v10-data", // localStorage key，与原始代码保持一致
      version: 1,
    }
  )
);
