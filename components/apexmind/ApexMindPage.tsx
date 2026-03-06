"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, PenSquare, Database, Settings2, Send, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * ApexMind 页面主组件
 * - 主界面只有一张大号聊天卡片，尽量轻盈、沉浸
 * - 模式切换嵌在输入框区域，类似 DeepSeek 的输入条体验
 */

type Mode = "record" | "chat";

type DraftItem = {
  type: "text" | "image";
  content: string;
  createdAt?: string;
};

type ChatBubble = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  mode: Mode;
  createdAt: Date;
  serverId?: string;
  kind?: "text" | "image";
  /** 是否为当前会话中尚未打包的记录模式草稿消息 */
  isDraft?: boolean;
  rag?: {
    ideaCount: number;
    chatCount: number;
    contexts?: {
      kind: "idea" | "chat";
      createdAt: string;
      score: number;
      tags?: string[];
      content: string;
    }[];
    loading?: boolean;
  };
};

type ModelConfig = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  embeddingApiKey?: string;
  chatModel: string;
  embeddingModel: string;
  isDefault: boolean;
};

export function ApexMindPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("record");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [savingIdea, setSavingIdea] = useState(false);
  const [expandedCitationsFor, setExpandedCitationsFor] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settings, setSettings] = useState({
    baseUrl: "",
    apiKey: "",
    chatModel: "",
    embeddingModel: "",
    systemPrompt: "",
    ragTopK: "",
    ragTimeWindowDays: "",
    hasApiKey: false,
    models: [] as ModelConfig[],
  });
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingPlanet, setImportingPlanet] = useState(false);
  const [purging, setPurging] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedChatMessageIds, setSelectedChatMessageIds] = useState<string[]>([]);
  const [deletingMessages, setDeletingMessages] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const planetImportFileInputRef = useRef<HTMLInputElement | null>(null);

  // 初始化时加载通用时间线（记录模式条目 + 聊天消息），恢复上一次离开时的整体聊天区状态
  useEffect(() => {
    async function loadTimeline() {
      try {
        const res = await fetch("/api/apexmind/timeline?limit=80");
        if (!res.ok) {
          console.error("[ApexMind] 加载时间线失败:", await res.text());
          return;
        }
        const data = await res.json();
        if (!data.success || !data.data?.items) return;

        const items = data.data.items as {
          id: string;
          source: "record" | "chat";
          mode: "record" | "chat";
          role: "user" | "assistant" | "system";
          kind: "text" | "image";
          content: string;
          createdAt: string;
        }[];

        const bubbles: ChatBubble[] = items.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          mode: item.mode,
          kind: item.kind,
          createdAt: new Date(item.createdAt),
          serverId:
            item.source === "chat"
              ? item.id.startsWith("chat-")
                ? item.id.slice("chat-".length)
                : item.id
              : undefined,
          // 从时间线恢复的消息都视为历史记录，不标记为草稿
          isDraft: false,
        }));

        setMessages(bubbles);
      } catch (error) {
        console.error("[ApexMind] 加载时间线异常:", error);
      }
    }

    async function loadDraft() {
      try {
        const res = await fetch("/api/apexmind/draft");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data?.items) {
          // 按需求：用户未保存就离开，下次不再还原这些草稿，直接删除
          await fetch("/api/apexmind/draft", { method: "DELETE" });
        }
      } catch (error) {
        console.error("[ApexMind] 加载草稿失败:", error);
      }
    }

    // 先加载时间线，再叠加当前未打包草稿，尽量还原上一次离开时的状态
    loadTimeline().then(() => {
      void loadDraft();
    });
  }, []);

  // 初始化时预加载一次 ApexMind 设置，用于主界面显示当前模型
  useEffect(() => {
    async function loadInitialSettings() {
      try {
        const res = await fetch("/api/apexmind/settings");
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.data) return;
        const s = data.data as {
          baseUrl?: string;
          chatModel?: string;
          embeddingModel?: string;
          systemPrompt?: string;
          ragTopK?: number | null;
          ragTimeWindowDays?: number | null;
          hasApiKey?: boolean;
          models?: any[] | null;
        };

        let models: ModelConfig[] = [];
        if (Array.isArray(s.models) && s.models.length > 0) {
          models = s.models
            .filter((m) => m && typeof m === "object")
            .map((raw, index) => ({
              id: (raw.id || `model-${index + 1}`).toString(),
              name: (raw.name as string | undefined)?.toString().trim() || "",
              baseUrl: (raw.baseUrl as string | undefined)?.toString().trim() || "",
              apiKey: "",
              embeddingApiKey:
                "",
              chatModel:
                (raw.chatModel as string | undefined)?.toString().trim() || "",
              embeddingModel:
                (raw.embeddingModel as string | undefined)?.toString().trim() || "",
              isDefault: Boolean(raw.isDefault),
            }));
        }

        if (!models.length && (s.baseUrl || s.chatModel)) {
          models = [
            {
              id: "model-1",
              name: "默认模型",
              baseUrl: s.baseUrl ?? "",
              apiKey: "",
              chatModel: s.chatModel ?? "",
              embeddingModel: s.embeddingModel ?? "",
              isDefault: true,
            },
          ];
        }

        setSettings((prev) => ({
          ...prev,
          baseUrl: s.baseUrl ?? prev.baseUrl,
          chatModel: s.chatModel ?? prev.chatModel,
          embeddingModel: s.embeddingModel ?? prev.embeddingModel,
          systemPrompt: s.systemPrompt ?? prev.systemPrompt,
          ragTopK:
            s.ragTopK != null ? String(s.ragTopK) : prev.ragTopK,
          ragTimeWindowDays:
            s.ragTimeWindowDays != null
              ? String(s.ragTimeWindowDays)
              : prev.ragTimeWindowDays,
          hasApiKey: prev.hasApiKey || Boolean(s.hasApiKey),
          models: models.length > 0 ? models : prev.models,
        }));
      } catch (error) {
        console.error("[ApexMind] 预加载设置失败:", error);
      }
    }

    loadInitialSettings();
  }, []);

  const recordCount = draftItems.length;
  const isRecordMode = mode === "record";

  // 轻盈的渐变背景
  const containerBgClass = useMemo(
    () =>
      "bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900",
    []
  );

  // 文本域自适应高度
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 140; // 限制一个上限，避免占满全屏
    el.style.height = `${Math.min(maxHeight, el.scrollHeight)}px`;
  }, [input]);

  // 将草稿写回后端
  async function syncDraft(items: DraftItem[]) {
    try {
      await fetch("/api/apexmind/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch (error) {
      console.error("[ApexMind] 同步草稿失败:", error);
    }
  }

  // 发送消息（根据模式分支）
  const handleSend = async () => {
    const text = input.trim();
    const hasText = text.length > 0;
    const hasImages = pendingImages.length > 0;
    if ((!hasText && !hasImages) || sending) return;

    if (mode === "record") {
      const now = new Date().toISOString();
      const newItems: DraftItem[] = [
        ...pendingImages.map((url): DraftItem => ({
          type: "image",
          content: url,
          createdAt: now,
        })),
      ];
      if (hasText) {
        newItems.push({
          type: "text",
          content: text,
          createdAt: now,
        });
      }
      const nextDraft = [...draftItems, ...newItems];
      setDraftItems(nextDraft);

      const draftImageBubbles: ChatBubble[] = pendingImages.map((url, idx) => ({
        id: `local-img-${Date.now()}-${idx}`,
        role: "user",
        content: url,
        mode: "record",
        kind: "image",
        createdAt: new Date(),
        isDraft: true,
      }));
      const draftTextBubbles: ChatBubble[] = hasText
        ? [
            {
              id: `local-${Date.now()}`,
              role: "user",
              content: text,
              mode: "record",
              kind: "text",
              createdAt: new Date(),
              isDraft: true,
            },
          ]
        : [];

      setMessages((prev) => [...prev, ...draftImageBubbles, ...draftTextBubbles]);
      setInput("");
      setPendingImages([]);
      await syncDraft(nextDraft);
      return;
    }

    // 聊天模式：调用后端 Chat 接口
    setSending(true);
    const now = new Date();
    const imageBubbles: ChatBubble[] = pendingImages.map((url, idx) => ({
      id: `user-img-${Date.now()}-${idx}`,
      role: "user",
      content: url,
      mode: "chat",
      kind: "image",
      createdAt: now,
    }));

    const userBubble: ChatBubble = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      mode: "chat",
      kind: "text",
      createdAt: now,
    };
    setMessages((prev) => [...prev, ...imageBubbles, userBubble]);
    setInput("");
    setPendingImages([]);

    try {
      const abortController = new AbortController();
      const timeoutId = window.setTimeout(() => {
        abortController.abort();
      }, 120_000);

      const res = await fetch("/api/apexmind/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text().catch(() => "");
        console.error("[ApexMind] Chat 接口错误:", errorText);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "system",
            content: "❗ 对话服务暂时不可用，请稍后再试。",
            mode: "chat",
            createdAt: new Date(),
          },
        ]);
        return;
      }

      // 流式读取返回内容，并实时更新最后一条 assistant 消息
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const assistantId = `assistant-${Date.now()}`;
      const createdAt = new Date();
      const serverId =
        res.headers.get("x-apexmind-assistant-message-id") || undefined;
      const ideaCount = Number(res.headers.get("x-apexmind-rag-idea-count") || "0");
      const chatCount = Number(res.headers.get("x-apexmind-rag-chat-count") || "0");

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          mode: "chat",
          createdAt,
          serverId,
          rag: {
            ideaCount: Number.isFinite(ideaCount) ? ideaCount : 0,
            chatCount: Number.isFinite(chatCount) ? chatCount : 0,
          },
        },
      ]);

      let done = false;
      let pending = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) {
          done = true;
          break;
        }
        if (!value) continue;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        pending += chunk;

        if (!pending) continue;

        const appended = pending;
        pending = "";

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: (m.content || "") + appended }
              : m
          )
        );
      }

      window.clearTimeout(timeoutId);
      // 安全起见：在流式读取正常结束时立即重置发送状态
      setSending(false);
    } catch (error) {
        console.error("[ApexMind] Chat 请求失败:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
            role: "system",
            content: "❗ 网络异常，请检查连接。",
            mode: "chat",
          createdAt: new Date(),
        },
      ]);
    } finally {
      // 兜底重置，避免异常情况下按钮一直卡在“发送中…”
      setSending(false);
    }
  };

  const loadCitations = async (bubbleId: string) => {
    const target = messages.find((m) => m.id === bubbleId);
    if (!target || target.role !== "assistant" || !target.serverId) return;
    if (target.rag?.contexts) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === bubbleId ? { ...m, rag: { ...(m.rag || { ideaCount: 0, chatCount: 0 }), loading: true } } : m
      )
    );

    try {
      const res = await fetch(
        `/api/apexmind/chat/context?messageId=${encodeURIComponent(target.serverId)}`
      );
      if (!res.ok) {
        console.error("[ApexMind] 加载引用失败:", await res.text());
        return;
      }
      const data = await res.json();
      if (!data.success) return;

      const contexts = Array.isArray(data.data?.contexts) ? data.data.contexts : [];
      const ideaCount = Number(data.data?.ideaCount || 0) || 0;
      const chatCount = Number(data.data?.chatCount || 0) || 0;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === bubbleId
            ? {
                ...m,
                rag: {
                  ideaCount,
                  chatCount,
                  contexts,
                  loading: false,
                },
              }
            : m
        )
      );
    } catch (e) {
      console.error("[ApexMind] 加载引用异常:", e);
    } finally {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === bubbleId
            ? { ...m, rag: { ...(m.rag || { ideaCount: 0, chatCount: 0 }), loading: false } }
            : m
        )
      );
    }
  };

  // 打包保存当前草稿为「完整想法」
  const handlePackIdeas = async () => {
    if (!draftItems.length) return;
    try {
      setSavingIdea(true);
      const res = await fetch("/api/apexmind/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: draftItems }),
      });
      if (!res.ok) {
        console.error("[ApexMind] 打包失败:", await res.text());
        return;
      }
      const data = await res.json();
      if (data.success) {
        setDraftItems([]);
        await fetch("/api/apexmind/draft", { method: "DELETE" });
        setMessages((prev) => [
          ...prev,
          {
            id: `packed-${Date.now()}`,
            role: "system",
            content: "✅ 本次灵感已打包为一条完整想法。",
            mode: "record",
            createdAt: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("[ApexMind] 打包保存失败:", error);
    } finally {
      setSavingIdea(false);
    }
  };

  // 打开设置时加载当前配置
  const openSettings = async () => {
    try {
      setSettingsOpen(true);
      setSettingsLoading(true);
      const res = await fetch("/api/apexmind/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.data) return;
      const s = data.data as {
        baseUrl?: string;
        chatModel?: string;
        embeddingModel?: string;
        systemPrompt?: string;
        ragTopK?: number | null;
        ragTimeWindowDays?: number | null;
        hasApiKey?: boolean;
        models?: any[] | null;
      };

      let models: ModelConfig[] = [];
      if (Array.isArray(s.models) && s.models.length > 0) {
        models = s.models
          .filter((m) => m && typeof m === "object")
          .map((raw, index) => ({
            id: (raw.id || `model-${index + 1}`).toString(),
            name: (raw.name as string | undefined)?.toString().trim() || "",
            baseUrl: (raw.baseUrl as string | undefined)?.toString().trim() || "",
            apiKey: (raw.apiKey as string | undefined)?.toString() || "",
            embeddingApiKey:
              (raw.embeddingApiKey as string | undefined)?.toString() || "",
            chatModel:
              (raw.chatModel as string | undefined)?.toString().trim() || "",
            embeddingModel:
              (raw.embeddingModel as string | undefined)?.toString().trim() || "",
            isDefault: Boolean(raw.isDefault),
          }));
      }

      // 如果没有 models，但顶层已经有 baseUrl/chatModel，则用它构造一个默认模型
      if (!models.length && (s.baseUrl || s.chatModel)) {
        models = [
          {
            id: "model-1",
            name: "默认模型",
            baseUrl: s.baseUrl ?? "",
            apiKey: "", // 不从后端回传，为安全起见保持空
            chatModel: s.chatModel ?? "",
            embeddingModel: s.embeddingModel ?? "",
            isDefault: true,
          },
        ];
      }
      setSettings((prev) => ({
        ...prev,
        baseUrl: s.baseUrl ?? "",
        chatModel: s.chatModel ?? "",
        embeddingModel: s.embeddingModel ?? "",
        systemPrompt: s.systemPrompt ?? "",
        ragTopK: s.ragTopK != null ? String(s.ragTopK) : "",
        ragTimeWindowDays: s.ragTimeWindowDays != null ? String(s.ragTimeWindowDays) : "",
        hasApiKey: prev.hasApiKey || Boolean((s as any).apiKey),
        apiKey: (s as any).apiKey ? String((s as any).apiKey) : "",
        models,
      }));
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);

      // 多模型配置下：Embedding API Key 必填
      if (settings.models.length > 0) {
        const missing = settings.models.find(
          (m) => !(m.embeddingApiKey || "").trim()
        );
        if (missing) {
          alert("请为每个模型填写 Embedding API Key");
          return;
        }
      }

      const body: any = {
        // 顶层字段可以让后端在无 models 情况下工作
        baseUrl: settings.baseUrl || null,
        chatModel: settings.chatModel || null,
        embeddingModel: settings.embeddingModel || null,
        systemPrompt: settings.systemPrompt || null,
      };
      if (settings.apiKey.trim()) {
        body.apiKey = settings.apiKey.trim();
      }
      if (settings.ragTopK.trim()) {
        const n = Number(settings.ragTopK.trim());
        if (!Number.isNaN(n)) body.ragTopK = n;
      }
      if (settings.ragTimeWindowDays.trim()) {
        const n = Number(settings.ragTimeWindowDays.trim());
        if (!Number.isNaN(n)) body.ragTimeWindowDays = n;
      }

      // 将前端模型列表同步到后端
      if (settings.models.length > 0) {
        body.models = settings.models.map((m) => {
          const out: any = {
            id: m.id,
            name: m.name,
            baseUrl: m.baseUrl,
            chatModel: m.chatModel,
            embeddingModel: m.embeddingModel,
            isDefault: m.isDefault,
          };
          // 明文保存/回显：始终提交
          out.apiKey = (m.apiKey || "").trim();
          out.embeddingApiKey = (m.embeddingApiKey || "").trim();
          return out;
        });
      }
      const res = await fetch("/api/apexmind/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error("[ApexMind] 保存设置失败:", await res.text());
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({
          ...prev,
          hasApiKey: prev.hasApiKey || Boolean(body.apiKey),
          apiKey: "",
        }));
        setSettingsOpen(false);
      }
    } catch (error) {
      console.error("[ApexMind] 保存设置异常:", error);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch("/api/apexmind/export");
      if (!res.ok) {
        console.error("[ApexMind] 导出失败:", await res.text());
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apexmind-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[ApexMind] 导出异常:", error);
    } finally {
      setExporting(false);
    }
  };

  const handlePurgeAll = async () => {
    if (purging) return;
    const confirmed = window.confirm(
      "确定要清空当前账号的所有 ApexMind 数据吗？该操作不可撤销。"
    );
    if (!confirmed) return;

    try {
      setPurging(true);
      const res = await fetch("/api/apexmind/purge", { method: "DELETE" });
      if (!res.ok) {
        console.error("[ApexMind] 清空数据失败:", await res.text());
        return;
      }
      const data = await res.json().catch(() => null);
      if (!data?.success) {
        console.error("[ApexMind] 清空数据失败:", data);
        return;
      }

      const stats = data.data || {};
      const ideaCount = Number(stats.ideas || 0);
      const chatCount = Number(stats.chatMessages || 0);

      alert(
        `已清空当前账号数据：\n\n` +
          `完整想法 ${ideaCount} 条\n` +
          `聊天消息 ${chatCount} 条`
      );

      setMessages([]);
      setSettingsOpen(false);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      console.error("[ApexMind] 清空数据异常:", error);
    } finally {
      setPurging(false);
    }
  };

  const handleImportClick = () => {
    if (importing) return;
    importFileInputRef.current?.click();
  };

  const handlePlanetImportClick = () => {
    if (importingPlanet) return;
    planetImportFileInputRef.current?.click();
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/apexmind/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("[ApexMind] 导入失败:", await res.text().catch(() => ""));
        return;
      }

      const data = await res.json().catch(() => null);
      if (!data?.success) {
        console.error("[ApexMind] 导入失败:", data);
        return;
      }

      const importedIdeas = Number(data.data?.importedIdeas || 0);
      const importedMessages = Number(data.data?.importedMessages || 0);

      alert(
        `导入成功：\n\n` +
          `完整想法 ${importedIdeas} 条\n` +
          `历史对话 ${importedMessages} 条`
      );

      // 强制刷新页面，重新加载时间线等数据
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      console.error("[ApexMind] 导入异常:", error);
    } finally {
      setImporting(false);
      // 允许再次选择同一个文件
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handlePlanetImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportingPlanet(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/apexmind/import-planet", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error(
          "[ApexMind] 导入星球帖子失败:",
          await res.text().catch(() => "")
        );
        return;
      }

      const data = await res.json().catch(() => null);
      if (!data?.success) {
        console.error("[ApexMind] 导入星球帖子失败:", data);
        return;
      }

      const importedIdeas = Number(data.data?.importedIdeas || 0);
      const importedImages = Number(data.data?.importedImages || 0);

      alert(`导入成功：\n\n帖子 ${importedIdeas} 条\n图片 ${importedImages} 张`);

      // 强制刷新页面，重新加载时间线等数据
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      console.error("[ApexMind] 导入星球帖子异常:", error);
    } finally {
      setImportingPlanet(false);
      // 允许再次选择同一个文件
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const defaultModel: ModelConfig | undefined =
    settings.models.find((m) => m.isDefault) || settings.models[0];

  const markdownComponents = {
    h1: (props: any) => (
      <h1 className="mb-2 text-[15px] font-semibold tracking-tight" {...props} />
    ),
    h2: (props: any) => (
      <h2 className="mt-2 mb-1 text-[14px] font-semibold tracking-tight" {...props} />
    ),
    h3: (props: any) => (
      <h3 className="mt-2 mb-1 text-[13px] font-semibold tracking-tight" {...props} />
    ),
    p: (props: any) => (
      <p className="my-1.5 whitespace-pre-wrap break-words" {...props} />
    ),
    strong: (props: any) => (
      <strong className="font-semibold text-zinc-900 dark:text-zinc-50" {...props} />
    ),
    em: (props: any) => (
      <em className="text-zinc-700 dark:text-zinc-200" {...props} />
    ),
    ul: (props: any) => (
      <ul className="my-1.5 list-disc pl-5 space-y-0.5" {...props} />
    ),
    ol: (props: any) => (
      <ol className="my-1.5 list-decimal pl-5 space-y-0.5" {...props} />
    ),
    li: (props: any) => <li className="leading-relaxed" {...props} />,
    blockquote: (props: any) => (
      <blockquote
        className="my-1.5 border-l-2 border-zinc-200 pl-3 italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
        {...props}
      />
    ),
    code: (props: any) => (
      <code
        className="rounded-md bg-zinc-100 px-1 py-0.5 text-[12px] font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
        {...props}
      />
    ),
    pre: (props: any) => (
      <pre
        className="my-2 rounded-md bg-zinc-100 px-2.5 py-2 text-[12px] font-mono text-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 overflow-x-auto"
        {...props}
      />
    ),
  };

  const handleSelectImages = async (files: FileList | File[] | null) => {
    if (!files || (files as any).length === 0) return;
    const fileArray: File[] = Array.isArray(files)
      ? files
      : Array.from(files as FileList);

    const images = fileArray.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;

    try {
      const uploadedUrls: string[] = [];

      for (const file of images) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/apexmind/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          console.error(
            "[ApexMind] 上传图片失败:",
            await res.text().catch(() => "")
          );
          continue;
        }

        const data = await res.json().catch(() => null);
        const url = data?.data?.url;
        if (typeof url === "string" && url.trim().length > 0) {
          uploadedUrls.push(url.trim());
        }
      }

      if (uploadedUrls.length > 0) {
        setPendingImages((prev) => [...prev, ...uploadedUrls]);
      }
    } catch (error) {
      console.error("[ApexMind] 上传图片异常:", error);
    }
  };

  return (
    <main
      className={`min-h-screen pt-16 pb-4 px-2 sm:px-4 md:px-6 ${containerBgClass}`}
    >
      <div className="mx-auto max-w-7xl h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center">
        {/* 整体聊天卡片：尽可能居中、轻盈 */}
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-4xl h-[min(460px,calc(100vh-6rem))] rounded-[26px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.08)] flex flex-col overflow-hidden"
        >
          {/* 右上角的轻量工具入口：批量删除对话 / 数据后台 / 设置 */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
            <button
              type="button"
              onClick={() => {
                setDeleteMode((prev) => !prev);
                setSelectedChatMessageIds([]);
              }}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white/70 dark:bg-zinc-900/80 border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors ${
                deleteMode
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
              aria-label="批量删除对话"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => router.push("/apexmind/dashboard")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              aria-label="数据后台"
            >
              <Database size={14} />
            </button>
            <button
              type="button"
              onClick={openSettings}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              aria-label="设置"
            >
              <Settings2 size={14} />
            </button>
          </div>

          {/* 顶部轻量标题 + 居中记录提示 */}
          <div className="flex items-center px-5 pt-4 pb-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
                <Sparkles size={15} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  ApexMind
                </span>
              </div>
            </div>
            <div className="flex flex-1 justify-center">
              <AnimatePresence initial={false}>
                {isRecordMode && recordCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="inline-flex items-center gap-2 rounded-full bg-zinc-100/80 text-zinc-600 px-3 py-1 text-[11px] border border-zinc-200 dark:bg-zinc-900/80 dark:text-zinc-200 dark:border-zinc-700"
                  >
                    <span className="text-[11px]">
                      正在记录想法（{recordCount} 条）
                    </span>
                    <button
                      type="button"
                      onClick={handlePackIdeas}
                      disabled={savingIdea}
                      className="rounded-full bg-zinc-900 text-zinc-50 px-2.5 py-0.5 text-[10px] font-medium hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {savingIdea ? "保存中…" : "保存"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setDraftItems([]);
                          setMessages((prev) =>
                            prev.filter((m) => !m.isDraft)
                          );
                          await fetch("/api/apexmind/draft", { method: "DELETE" });
                        } catch (e) {
                          console.error("[ApexMind] 取消记录失败:", e);
                        }
                      }}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      取消
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex-1" />
          </div>

          {/* 批量删除对话模式提示条 */}
          {deleteMode && (
            <div className="px-5 pb-1 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>已选择 {selectedChatMessageIds.length} 条聊天消息</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteMode(false);
                    setSelectedChatMessageIds([]);
                  }}
                  className="px-2 py-0.5 rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={selectedChatMessageIds.length === 0 || deletingMessages}
                  onClick={async () => {
                    if (selectedChatMessageIds.length === 0 || deletingMessages) return;
                    try {
                      setDeletingMessages(true);
                      const res = await fetch("/api/apexmind/chat", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids: selectedChatMessageIds }),
                      });
                      if (!res.ok) {
                        console.error(
                          "[ApexMind] 批量删除对话失败:",
                          await res.text()
                        );
                        return;
                      }
                      const data = await res.json().catch(() => null);
                      if (!data || !data.success) {
                        console.error("[ApexMind] 批量删除对话失败: ", data);
                        return;
                      }
                      setMessages((prev) =>
                        prev.filter(
                          (m) =>
                            !(
                              m.mode === "chat" &&
                              m.serverId &&
                              selectedChatMessageIds.includes(m.serverId)
                            )
                        )
                      );
                      setSelectedChatMessageIds([]);
                      setDeleteMode(false);
                    } catch (error) {
                      console.error("[ApexMind] 批量删除对话异常:", error);
                    } finally {
                      setDeletingMessages(false);
                    }
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
                >
                  {deletingMessages ? "删除中…" : "删除选中"}
                </button>
              </div>
            </div>
          )}

          {/* 消息流区域 */}
          <div className="relative flex-1 px-4 pb-2 pt-1 overflow-y-auto">
            <div className="flex flex-col gap-2 pb-2">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`flex ${
                    msg.role === "assistant" || msg.role === "system"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`relative max-w-[82%] rounded-2xl px-3 py-2.5 text-sm border shadow-sm ${
                      msg.role === "assistant"
                        ? "bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:border-zinc-700"
                        : msg.role === "system"
                        ? "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700"
                        : isRecordMode && msg.mode === "record"
                        ? "bg-emerald-50 text-emerald-900 border-emerald-100 dark:bg-emerald-950 dark:text-emerald-50 dark:border-emerald-900"
                        : "bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-50 dark:border-zinc-800"
                    }`}
                  >
                    {deleteMode &&
                      msg.mode === "chat" &&
                      msg.serverId &&
                      msg.role !== "system" && (
                        <button
                          type="button"
                          onClick={() => {
                            const id = msg.serverId!;
                            setSelectedChatMessageIds((prev) =>
                              prev.includes(id)
                                ? prev.filter((x) => x !== id)
                                : [...prev, id]
                            );
                          }}
                          className={`absolute -top-1 -right-1 h-4 w-4 rounded-full border text-[10px] flex items-center justify-center shadow-sm ${
                            selectedChatMessageIds.includes(msg.serverId)
                              ? "bg-red-500 border-red-500 text-white"
                              : "bg-white/90 border-zinc-300 text-zinc-500"
                          }`}
                          aria-label="选择删除该对话"
                        >
                          ✓
                        </button>
                      )}
                    {msg.kind === "image" || msg.content.startsWith("data:image/") ? (
                      <img
                        src={msg.content}
                        alt="图片消息"
                        className="max-h-64 max-w-full rounded-lg object-contain"
                      />
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents as any}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}

                    {msg.role === "assistant" && (
                      <div className="mt-2 border-t border-zinc-100 pt-1.5 text-[10px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            引用 {msg.rag?.ideaCount ?? 0} 条想法 / {msg.rag?.chatCount ?? 0} 条历史对话
                          </span>
                          {(msg.rag?.ideaCount || 0) + (msg.rag?.chatCount || 0) > 0 && (
                            <button
                              type="button"
                              className="hover:text-zinc-600 dark:hover:text-zinc-300"
                              onClick={async () => {
                                setExpandedCitationsFor((prev) => (prev === msg.id ? null : msg.id));
                                if (expandedCitationsFor !== msg.id) {
                                  await loadCitations(msg.id);
                                }
                              }}
                            >
                              {expandedCitationsFor === msg.id ? "收起" : "查看"}
                            </button>
                          )}
                        </div>

                        {expandedCitationsFor === msg.id && (
                          <div className="mt-1.5 space-y-1.5">
                            {msg.rag?.loading && (
                              <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                正在加载引用…
                              </div>
                            )}
                            {!msg.rag?.loading &&
                              (msg.rag?.contexts || []).map((ctx, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-md bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
                                >
                                  <div className="mb-0.5 flex items-center justify-between gap-2">
                                    <span className="shrink-0">
                                      {ctx.kind === "idea" ? "想法" : "历史对话"} ·{" "}
                                      {new Date(ctx.createdAt).toLocaleString()}
                                    </span>
                                    {ctx.tags && ctx.tags.length > 0 && (
                                      <span className="truncate">
                                        #{ctx.tags.join(" #")}
                                      </span>
                                    )}
                                  </div>
                                  <div className="whitespace-pre-wrap break-words">
                                    {ctx.content}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs sm:text-sm text-zinc-400 dark:text-zinc-500">
                  <p className="mb-1">此刻还没有任何想法。</p>
                  <p>先写下一句话，或直接问问 ApexMind 在想什么。</p>
                </div>
              )}
            </div>
          </div>

          {/* 底部输入区：文本 + 模式/模型/发送 全部包裹在一个矩形内，贴合 DeepSeek 布局 */}
          <div className="border-t border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/80 dark:bg-zinc-950/90 px-4 py-3">
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-950/95 shadow-sm px-3.5 py-2.5 flex flex-col gap-1.5">
              {/* 待发送图片预览 */}
              {pendingImages.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-2">
                  {pendingImages.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="relative w-16 h-16 rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <img
                        src={url}
                        alt="待发送图片"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPendingImages((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center shadow-sm hover:bg-red-500"
                        aria-label="移除图片"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 文本输入区域 */}
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent border-0 outline-none resize-none text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 leading-relaxed max-h-[160px]"
                rows={1}
                placeholder={
                  isRecordMode
                    ? "简要记录此刻的想法、灵感或待办事项…"
                    : "向 ApexMind 提出问题，或让它基于历史想法给出建议…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  const files: File[] = [];
                  for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.kind === "file" && item.type.startsWith("image/")) {
                      const file = item.getAsFile();
                      if (file) files.push(file);
                    }
                  }
                  if (files.length > 0) {
                    handleSelectImages({
                      length: files.length,
                      item: (n: number) => files[n],
                      [Symbol.iterator]: function* () {
                        for (const f of files) yield f;
                      },
                    } as any);
                  }
                }}
              />

              {/* 模式 / 模型 / 工具 / 发送 操作行（与输入框同一矩形内） */}
              <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                <div className="flex items-center gap-2">
                  {/* 模式切换 */}
                  <button
                    type="button"
                    onClick={() =>
                      setMode((prev) => (prev === "record" ? "chat" : "record"))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border transition-colors ${
                      isRecordMode
                        ? "bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-100 dark:border-emerald-900"
                        : "bg-white/90 text-zinc-500 border-zinc-200 hover:text-zinc-800 hover:border-zinc-300 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800 dark:hover:text-zinc-100"
                    }`}
                  >
                    {isRecordMode ? (
                      <>
                        <Sparkles size={12} className="text-emerald-600" />
                        <span>记录模式</span>
                      </>
                    ) : (
                      <>
                        <PenSquare size={12} className="text-zinc-500" />
                        <span>聊天模式</span>
                      </>
                    )}
                  </button>

                  {/* 当前默认模型展示 */}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-zinc-200 bg-white/90 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    <span>{defaultModel?.name || "未配置模型"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    aria-label="上传图片"
                  >
                    <Plus size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={(!input.trim() && pendingImages.length === 0) || sending}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 text-zinc-50 px-3 py-1.5 shadow-sm hover:bg-zinc-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-transform"
                    aria-label="发送"
                  >
                    <Send size={14} />
                    <span>{sending && !isRecordMode ? "发送中…" : "发送"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleSelectImages(e.target.files)}
          />
          <input
            ref={importFileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFileChange}
          />
          <input
            ref={planetImportFileInputRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            className="hidden"
            onChange={handlePlanetImportFileChange}
          />
        </motion.section>

        {/* 设置弹窗 */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-lg rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 shadow-2xl px-5 py-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
                      <Settings2 size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold tracking-tight">
                        ApexMind 设置
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        配置对话与向量检索所用的模型与接口
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 text-xs"
                  >
                    关闭
                  </button>
                </div>

                {settingsLoading ? (
                  <div className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    正在加载配置…
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    {/* 多模型配置列表 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          模型列表
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              models: [
                                ...prev.models,
                                {
                                  id: `model-${prev.models.length + 1}`,
                                  name: "",
                                  baseUrl: "",
                                  apiKey: "",
                                  embeddingApiKey: "",
                                  chatModel: "",
                                  embeddingModel: "",
                                  isDefault: prev.models.length === 0,
                                } as ModelConfig,
                              ],
                            }))
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
                        >
                          <Plus size={10} />
                          <span>新增模型</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {settings.models.length === 0 && (
                          <div className="rounded-md border border-dashed border-zinc-200 px-3 py-2 text-[11px] text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                            目前还没有单独的模型配置，将默认使用上方页面中的基础设置。
                          </div>
                        )}
                        {settings.models.map((model, index) => (
                          <div
                            key={model.id}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 space-y-1.5 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <div className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] items-center gap-2">
                              <input
                                type="text"
                                value={model.name}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    models: prev.models.map((m) =>
                                      m.id === model.id
                                        ? { ...m, name: e.target.value }
                                        : m
                                    ),
                                  }))
                                }
                                className="w-full min-w-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                                placeholder="模型名称"
                                name={`apexmind-model-name-${model.id}`}
                                autoComplete="off"
                                spellCheck={false}
                              />
                              <input
                                type="text"
                                value={model.baseUrl}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    models: prev.models.map((m) =>
                                      m.id === model.id
                                        ? { ...m, baseUrl: e.target.value }
                                        : m
                                    ),
                                  }))
                                }
                                placeholder="Base URL"
                                className="w-full min-w-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                                name={`apexmind-model-baseurl-${model.id}`}
                                autoComplete="off"
                                spellCheck={false}
                                data-lpignore="true"
                                data-1p-ignore="true"
                              />
                              <div className="flex items-center gap-2 justify-self-end shrink-0">
                                <label className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                                  <input
                                    type="radio"
                                    checked={model.isDefault}
                                    onChange={() =>
                                      setSettings((prev) => ({
                                        ...prev,
                                        models: prev.models.map((m) => ({
                                          ...m,
                                          isDefault: m.id === model.id,
                                        })),
                                      }))
                                    }
                                    className="h-3 w-3 accent-zinc-900 dark:accent-zinc-200"
                                  />
                                  默认
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSettings((prev) => {
                                      const filtered = prev.models.filter(
                                        (m) => m.id !== model.id
                                      );
                                      // 若删除的是默认模型，则将第一个设为默认
                                      if (
                                        model.isDefault &&
                                        filtered.length > 0
                                      ) {
                                        filtered[0] = {
                                          ...filtered[0],
                                          isDefault: true,
                                        };
                                      }
                                      return { ...prev, models: filtered };
                                    })
                                  }
                                  className="text-[10px] text-zinc-400 hover:text-red-500"
                                >
                                  删除
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={model.apiKey}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    models: prev.models.map((m) =>
                                      m.id === model.id
                                        ? { ...m, apiKey: e.target.value }
                                        : m
                                    ),
                                  }))
                                }
                                placeholder="API Key"
                                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                                name={`apexmind-model-apikey-${model.id}`}
                                autoComplete="off"
                                spellCheck={false}
                                data-lpignore="true"
                                data-1p-ignore="true"
                              />
                              <input
                                type="text"
                                value={model.embeddingApiKey || ""}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    models: prev.models.map((m) =>
                                      m.id === model.id
                                        ? { ...m, embeddingApiKey: e.target.value }
                                        : m
                                    ),
                                  }))
                                }
                                placeholder="Embedding API Key"
                                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                                name={`apexmind-model-embedding-apikey-${model.id}`}
                                autoComplete="off"
                                spellCheck={false}
                                data-lpignore="true"
                                data-1p-ignore="true"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={model.chatModel}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    models: prev.models.map((m) =>
                                      m.id === model.id
                                        ? { ...m, chatModel: e.target.value }
                                        : m
                                    ),
                                  }))
                                }
                                placeholder="Chat Model"
                                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                                name={`apexmind-model-chatmodel-${model.id}`}
                                autoComplete="off"
                                spellCheck={false}
                              />
                              <input
                                type="text"
                                value={model.embeddingModel}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    models: prev.models.map((m) =>
                                      m.id === model.id
                                        ? {
                                            ...m,
                                            embeddingModel: e.target.value,
                                          }
                                        : m
                                    ),
                                  }))
                                }
                                placeholder="Embedding Model"
                                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                                name={`apexmind-model-embedding-model-${model.id}`}
                                autoComplete="off"
                                spellCheck={false}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-zinc-500 dark:text-zinc-400">
                          RAG Top-K
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={settings.ragTopK}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, ragTopK: e.target.value }))
                          }
                          placeholder="默认 8"
                          className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-zinc-500 dark:text-zinc-400">
                          时间窗口（天）
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={settings.ragTimeWindowDays}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              ragTimeWindowDays: e.target.value,
                            }))
                          }
                          placeholder="例如 180"
                          className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-zinc-500 dark:text-zinc-400">
                        System Prompt（人设）
                      </label>
                      <textarea
                        rows={3}
                        value={settings.systemPrompt}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            systemPrompt: e.target.value,
                          }))
                        }
                        placeholder="例如：你是一位帮助用户整理想法、做决策的个人知识教练…"
                        className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-500"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={exporting}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exporting ? "导出中…" : "导出"}
                    </button>
                    <button
                      type="button"
                      onClick={handleImportClick}
                      disabled={importing}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? "导入中…" : "导入"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePlanetImportClick}
                      disabled={importingPlanet}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importingPlanet ? "导入中…" : "导入星球帖子"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePurgeAll}
                      disabled={purging}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {purging ? "清空中…" : "清空数据"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="px-3 py-1.5 rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={settingsSaving}
                      className="px-3 py-1.5 rounded-full bg-zinc-900 text-zinc-50 text-[11px] hover:bg-zinc-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {settingsSaving ? "保存中…" : "保存设置"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}



