"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";

type TabKey = "ideas" | "chats";

type MindIdea = {
  id: string;
  content: string;
  tags: string[];
  imageUrls: string[];
  createdAt: string;
};

type IdeasResponse = {
  success: boolean;
  data: MindIdea[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type DashboardSummary = {
  month: string;
  heatmap: { activeDays: string[] };
  stats: {
    all: {
      ideas: { count: number; chars: number };
      chats: { count: number; chars: number };
    };
    month: {
      ideas: { count: number; chars: number };
      chats: { count: number; chars: number };
    };
  };
  keywords: {
    week: { word: string; count: number }[];
    month: { word: string; count: number }[];
    year: { word: string; count: number }[];
  };
};

type DashboardSummaryResponse = {
  success: boolean;
  data?: DashboardSummary;
};

type ChatSessionItem = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  title: string | null;
  messageCount: number;
  userMessageCount: number;
};

type ChatSessionsResponse = {
  success: boolean;
  data?: ChatSessionItem[];
};

type ChatMessageItem = {
  id: string;
  role: "user" | "assistant" | "system" | string;
  content: string;
  createdAt: string;
};

type SessionMessagesResponse = {
  success: boolean;
  data?: ChatMessageItem[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1, 0, 0, 0, 0);
}

function formatInt(n: number) {
  try {
    return new Intl.NumberFormat("zh-CN").format(n);
  } catch {
    return String(n);
  }
}

export function ApexMindDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("ideas");

  const [ideas, setIdeas] = useState<MindIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [keyword, setKeyword] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [onlyWithImage, setOnlyWithImage] = useState(false);

  const [monthCursor, setMonthCursor] = useState<Date>(() => monthStart(new Date()));
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [keywordRange, setKeywordRange] = useState<"week" | "month" | "year">("week");

  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [sessionMessagesLoading, setSessionMessagesLoading] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<ChatMessageItem[]>([]);

  // 根据屏幕高度动态计算每页条数（不让内容超过一屏太多）
  useEffect(() => {
    function updatePageSize() {
      if (typeof window === "undefined") return;
      const vh = window.innerHeight || 800;
      // 预留顶部导航、左右留白等空间
      const usable = vh - 200;
      // 预估单条卡片含间距高度（和 h-64 接近）
      const approxCard = 220;
      const min = 3;
      const max = 20;
      const estimated = Math.max(min, Math.min(max, Math.floor(usable / approxCard)));
      setPageSize(estimated);
    }
    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  // 加载想法列表
  useEffect(() => {
    if (tab !== "ideas") return;
    async function loadIdeas() {
      try {
        setLoadingIdeas(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (keyword.trim()) params.set("keyword", keyword.trim());
        if (tagFilter.trim()) params.set("tags", tagFilter.trim());
        if (onlyWithImage) params.set("hasImage", "1");

        const res = await fetch(`/api/apexmind/ideas?${params.toString()}`);
        if (!res.ok) {
          console.error("[ApexMind] 加载想法失败:", await res.text());
          return;
        }
        const data: IdeasResponse = await res.json();
        if (!data.success) return;
        setIdeas(data.data);
        setTotal(data.pagination.total);
      } catch (error) {
        console.error("[ApexMind] 加载想法异常:", error);
      } finally {
        setLoadingIdeas(false);
      }
    }
    loadIdeas();
  }, [tab, page, pageSize, keyword, tagFilter, onlyWithImage]);

  // 加载概览 summary
  useEffect(() => {
    async function loadSummary() {
      try {
        setSummaryLoading(true);
        const month = monthKeyFromDate(monthCursor);
        const res = await fetch(
          `/api/apexmind/dashboard/summary?month=${encodeURIComponent(month)}`
        );
        if (!res.ok) {
          console.error("[ApexMind] 加载后台概览失败:", await res.text());
          return;
        }
        const data: DashboardSummaryResponse = await res.json();
        if (!data.success || !data.data) return;
        setSummary(data.data);
      } catch (e) {
        console.error("[ApexMind] 加载后台概览异常:", e);
      } finally {
        setSummaryLoading(false);
      }
    }
    loadSummary();
  }, [monthCursor]);

  // 加载会话列表
  useEffect(() => {
    if (tab !== "chats") return;
    async function loadSessions() {
      try {
        setSessionsLoading(true);
        const res = await fetch("/api/apexmind/chat/sessions?take=80");
        if (!res.ok) {
          console.error("[ApexMind] 加载会话列表失败:", await res.text());
          return;
        }
        const data: ChatSessionsResponse = await res.json();
        if (!data.success || !Array.isArray(data.data)) return;
        setSessions(data.data);
        if (!selectedSessionId && data.data.length > 0) {
          setSelectedSessionId(data.data[0].id);
        }
      } catch (e) {
        console.error("[ApexMind] 加载会话列表异常:", e);
      } finally {
        setSessionsLoading(false);
      }
    }
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // 加载会话消息
  useEffect(() => {
    if (tab !== "chats") return;
    if (!selectedSessionId) {
      setSessionMessages([]);
      return;
    }
    async function loadSessionMessages() {
      try {
        setSessionMessagesLoading(true);
        const res = await fetch(
          `/api/apexmind/chat/sessions/${encodeURIComponent(
            selectedSessionId
          )}/messages?limit=800`
        );
        if (!res.ok) {
          console.error("[ApexMind] 加载会话消息失败:", await res.text());
          return;
        }
        const data: SessionMessagesResponse = await res.json();
        if (!data.success || !Array.isArray(data.data)) return;
        setSessionMessages(data.data);
      } catch (e) {
        console.error("[ApexMind] 加载会话消息异常:", e);
      } finally {
        setSessionMessagesLoading(false);
      }
    }
    loadSessionMessages();
  }, [tab, selectedSessionId]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const allTags = useMemo(() => {
    const set = new Set<string>();
    ideas.forEach((idea) => {
      idea.tags.forEach((t) => {
        if (t) set.add(t);
      });
    });
    return Array.from(set).sort();
  }, [ideas]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/apexmind/ideas/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error("[ApexMind] 删除想法失败:", await res.text());
        return;
      }
      const data = await res.json();
      if (!data.success) return;
      setIdeas((prev) => prev.filter((idea) => idea.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("[ApexMind] 删除想法异常:", error);
    }
  };

  const heatmap = useMemo(() => {
    const active = new Set<string>(summary?.heatmap.activeDays || []);
    const base = monthCursor;
    const year = base.getFullYear();
    const month = base.getMonth();
    const first = new Date(year, month, 1, 0, 0, 0, 0);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // 以周一为一周的起始（0 表示周一）
    const startWeekday = (first.getDay() + 6) % 7;

    const cells: Array<{ key: string; label: string; isActive: boolean; isBlank: boolean }> =
      [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ key: `blank-${i}`, label: "", isActive: false, isBlank: true });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day, 0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      cells.push({
        key,
        label: String(day),
        isActive: active.has(key),
        isBlank: false,
      });
    }
    return {
      year,
      month: month + 1,
      cells,
    };
  }, [monthCursor, summary]);

  const handleDeleteSession = async (id: string) => {
    if (!id) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm("确定要删除这个会话及其所有消息吗？");
      if (!ok) return;
    }
    try {
      const res = await fetch(
        `/api/apexmind/chat/sessions/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        console.error("[ApexMind] 删除会话失败:", await res.text());
        return;
      }
      const data = await res.json();
      if (!data.success) return;

      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSessionMessages((prev) =>
        selectedSessionId === id ? [] : prev
      );
      if (selectedSessionId === id) {
        setSelectedSessionId((prevId) => {
          if (prevId !== id) return prevId;
          const next = sessions.filter((s) => s.id !== id);
          return next[0]?.id ?? "";
        });
      }
    } catch (e) {
      console.error("[ApexMind] 删除会话异常:", e);
    }
  };

  const handleDeleteMessage = async (messageId: string, role: string) => {
    if (!messageId) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm("确定要删除这条消息吗？");
      if (!ok) return;
    }
    try {
      const res = await fetch("/api/apexmind/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [messageId] }),
      });
      if (!res.ok) {
        console.error("[ApexMind] 删除消息失败:", await res.text());
        return;
      }
      const data = await res.json();
      if (!data.success) return;

      setSessionMessages((prev) => prev.filter((m) => m.id !== messageId));
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== selectedSessionId) return s;
          const nextTotal = Math.max(0, s.messageCount - 1);
          const nextUser =
            role === "user"
              ? Math.max(0, s.userMessageCount - 1)
              : s.userMessageCount;
          return { ...s, messageCount: nextTotal, userMessageCount: nextUser };
        })
      );
    } catch (e) {
      console.error("[ApexMind] 删除消息异常:", e);
    }
  };

  return (
    <main className="min-h-screen pt-16 pb-4 px-2 sm:px-4 md:px-6 bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-6xl h-[calc(100vh-5rem-1rem)] mt-3">
        <div className="h-full grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-3">
          {/* 左栏：返回 + 统计 + 热力图 + 关键词 */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 shadow-sm px-3.5 py-3 flex flex-col gap-3 text-[12px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push("/apexmind")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                aria-label="返回聊天"
              >
                <ArrowLeft size={12} />
              </button>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                ApexMind 数据概览
              </span>
            </div>

            {/* 统计 */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 p-3 text-[12px]">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] text-zinc-600 dark:text-zinc-300">数据统计</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">本月想法</div>
                  <div className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatInt(summary?.stats.month.ideas.count || 0)}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    字数 {formatInt(summary?.stats.month.ideas.chars || 0)}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">本月对话</div>
                  <div className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatInt(summary?.stats.month.chats.count || 0)}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    字数 {formatInt(summary?.stats.month.chats.chars || 0)}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">累计想法</div>
                  <div className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatInt(summary?.stats.all.ideas.count || 0)}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    字数 {formatInt(summary?.stats.all.ideas.chars || 0)}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">累计对话</div>
                  <div className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatInt(summary?.stats.all.chats.count || 0)}
                  </div>
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    字数 {formatInt(summary?.stats.all.chats.chars || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* 热力图 */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-300">
                  <Calendar size={14} className="text-zinc-400" />
                  <span>
                    {heatmap.year} 年 {heatmap.month} 月
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMonthCursor((d) => addMonths(d, -1))}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    aria-label="上个月"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthCursor(() => monthStart(new Date()))}
                    className="px-2 py-1 rounded-full border border-zinc-200 bg-white text-[10px] text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    本月
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthCursor((d) => addMonths(d, +1))}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    aria-label="下个月"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
              {summaryLoading ? (
                <div className="py-4 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                  加载中…
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5">
                  {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
                    <div
                      key={w}
                      className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center"
                    >
                      {w}
                    </div>
                  ))}
                  {heatmap.cells.map((c) => (
                    <div
                      key={c.key}
                      title={c.isBlank ? "" : c.key}
                      className={`h-6 rounded-md border text-[11px] flex items-center justify-center ${
                        c.isBlank
                          ? "border-transparent"
                          : c.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                          : "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600"
                      }`}
                    >
                      {c.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 关键词词云 */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 p-3 text-[12px]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[12px] text-zinc-600 dark:text-zinc-300">关键词</span>
                <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setKeywordRange("week")}
                    className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                      keywordRange === "week"
                        ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                        : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    本周
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeywordRange("month")}
                    className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                      keywordRange === "month"
                        ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                        : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    本月
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeywordRange("year")}
                    className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                      keywordRange === "year"
                        ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                        : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    今年
                  </button>
                </div>
              </div>

              {(() => {
                const items = summary?.keywords[keywordRange] || [];
                if (items.length === 0) {
                  return (
                    <div className="h-20 flex items-center justify-center text-[11px] text-zinc-400 dark:text-zinc-600">
                      暂无关键词
                    </div>
                  );
                }
                const top = items.slice(0, 5);
                const max = top[0]?.count || 1;
                const min = top[top.length - 1]?.count || 1;
                const span = Math.max(1, max - min);

                return (
                  <div className="min-h-[80px] flex flex-wrap gap-2">
                    {top.map((it) => {
                      const rel = (it.count - min) / span;
                      const size = 13 + rel * 8; // 13px ~ 21px
                      const opacity = 0.5 + rel * 0.5;
                      return (
                        <span
                          key={it.word}
                          className="inline-flex items-center rounded-full px-2 py-0.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          style={{ fontSize: `${size}px`, opacity }}
                          title={`${it.word} · ${it.count}`}
                        >
                          {it.word}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </section>

          {/* 右栏：Tab + 筛选 + 内容区 */}
          <section className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 shadow-sm px-3.5 py-3 flex flex-col gap-2 text-[12px]">
            {/* Tab + 搜索/筛选（仅想法） */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setTab("ideas")}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] border transition-colors ${
                    tab === "ideas"
                      ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                      : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  <Sparkles size={12} />
                  想法
                </button>
                <button
                  type="button"
                  onClick={() => setTab("chats")}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] border transition-colors ${
                    tab === "chats"
                      ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                      : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  <MessageSquare size={12} />
                  对话
                </button>
              </div>

              {tab === "ideas" && (
                <div className="flex-1 min-w-[220px] flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
                  <Search size={12} className="text-zinc-400" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => {
                      setPage(1);
                      setKeyword(e.target.value);
                    }}
                    placeholder="按内容关键字搜索"
                    className="w-full bg-transparent text-[12px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-500"
                  />
                </div>
              )}
            </div>

            {tab === "ideas" && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setTagFilter("");
                    setOnlyWithImage(false);
                  }}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 border text-[10px] ${
                    !tagFilter && !onlyWithImage
                      ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                      : "bg-white text-zinc-500 border-zinc-200 hover:text-zinc-800 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700 dark:hover:text-zinc-100"
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setTagFilter("");
                    setOnlyWithImage(true);
                  }}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 border text-[10px] ${
                    onlyWithImage
                      ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                      : "bg-white text-zinc-500 border-zinc-200 hover:text-zinc-800 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700 dark:hover:text-zinc-100"
                  }`}
                >
                  图片
                </button>

                {allTags.length > 0 && (
                  <>
                    <span className="mx-1 h-3 w-px bg-zinc-200 dark:bg-zinc-800" />
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setPage(1);
                          setTagFilter(tag);
                          setOnlyWithImage(false);
                        }}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 border text-[10px] ${
                          tagFilter === tag
                            ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50"
                            : "bg-white text-zinc-500 border-zinc-200 hover:text-zinc-800 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700 dark:hover:text-zinc-100"
                        }`}
                      >
                        <Tag size={10} className="text-zinc-400" />
                        <span>{tag}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* 内容区：想法 Tab（原列表）/ 对话 Tab（会话+消息） */}
            <div className="flex-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 shadow-sm px-3.5 py-3 flex flex-col">
              {tab === "ideas" ? (
                loadingIdeas ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                    正在加载数据…
                  </div>
                ) : ideas.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                    暂无想法记录，先回到 ApexMind 打包几条记录吧。
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-3">
                        {ideas.map((idea) => (
                          <motion.article
                            key={idea.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18 }}
                            className="flex flex-col max-h-64 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[12px] text-zinc-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 overflow-hidden"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                {new Date(idea.createdAt).toLocaleString()}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {idea.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {idea.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                    {idea.tags.length > 3 && (
                                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                        +{idea.tags.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDelete(idea.id)}
                                  className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:text-zinc-600 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                  aria-label="删除想法"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                              {idea.imageUrls && idea.imageUrls.length > 0 && (
                                <div className="mb-1.5 flex flex-wrap gap-1.5">
                                  {idea.imageUrls.slice(0, 3).map((url) => (
                                    <div
                                      key={url}
                                      className="relative w-16 h-16 rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
                                    >
                                      <img
                                        src={url}
                                        alt="想法图片"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                  {idea.imageUrls.length > 3 && (
                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 self-end">
                                      +{idea.imageUrls.length - 3} 张
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {idea.content}
                              </p>
                            </div>
                          </motion.article>
                        ))}
                      </div>
                    </div>

                    {/* 分页条 */}
                    <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span>
                        共 {total} 条 · 第 {page}/{totalPages} 页
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="px-2 py-0.5 rounded-full border border-zinc-200 bg-white text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed hover:text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          上一页
                        </button>
                        <button
                          type="button"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className="px-2 py-0.5 rounded-full border border-zinc-200 bg-white text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed hover:text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          下一页
                        </button>
                      </div>
                    </div>
                  </>
                )
              ) : (
                <div className="flex-1 min-h-0 flex flex-col">
                  {sessionsLoading ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                      正在加载会话…
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                      暂无对话记录。
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex gap-3">
                      <aside className="w-[300px] shrink-0 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 overflow-hidden flex flex-col">
                        <div className="px-3 py-2 border-b border-zinc-200/70 dark:border-zinc-800/70 text-[11px] text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                          <span>会话列表</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {formatInt(sessions.length)} 个
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {sessions.map((s) => {
                            const active = s.id === selectedSessionId;
                            return (
                              <div
                                key={s.id}
                                onClick={() => setSelectedSessionId(s.id)}
                                className={`w-full px-3 py-2 border-b border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer ${
                                  active ? "bg-zinc-50 dark:bg-zinc-900/60" : "bg-transparent"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-zinc-800 dark:text-zinc-100 truncate">
                                    {s.title?.trim()
                                      ? s.title
                                      : new Date(s.startedAt).toLocaleString()}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                      {formatInt(s.userMessageCount)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSession(s.id);
                                      }}
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:text-zinc-600 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                      aria-label="删除会话"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between gap-2">
                                  <span className="truncate">
                                    {new Date(s.startedAt).toLocaleString()}
                                  </span>
                                  <span className="shrink-0">
                                    共 {formatInt(s.messageCount)} 条
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </aside>

                      <div className="flex-1 min-w-0 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 overflow-hidden flex flex-col">
                        <div className="px-3 py-2 border-b border-zinc-200/70 dark:border-zinc-800/70 text-[11px] text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                          <span>会话消息</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {selectedSessionId ? `ID: ${selectedSessionId.slice(0, 8)}…` : ""}
                          </span>
                        </div>
                        {sessionMessagesLoading ? (
                          <div className="flex-1 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                            正在加载消息…
                          </div>
                        ) : sessionMessages.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                            暂无消息。
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                            {sessionMessages.map((m) => (
                              <div
                                key={m.id}
                                className={`flex ${
                                  m.role === "assistant" || m.role === "system"
                                    ? "justify-start"
                                    : "justify-end"
                                }`}
                              >
                                <div
                                  className={`max-w-[78%] rounded-2xl border px-3 py-2 text-[11px] whitespace-pre-wrap break-words ${
                                    m.role === "assistant"
                                      ? "bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:border-zinc-700"
                                      : m.role === "system"
                                      ? "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700"
                                      : "bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-50 dark:border-zinc-800"
                                  }`}
                                >
                                  <div className="mb-1 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between gap-2">
                                    <span className="uppercase">{m.role}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span>
                                        {new Date(m.createdAt).toLocaleString()}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMessage(m.id, m.role)}
                                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:text-zinc-600 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                        aria-label="删除消息"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  </div>
                                  {m.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

