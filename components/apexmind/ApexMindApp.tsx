"use client";

import Link from "next/link";
import { BarChart3, LoaderCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { IconButton } from "@/components/ui/IconButton";
import { Toast } from "@/components/ui/Toast";
import { Composer } from "@/components/apexmind/Composer";
import { ThoughtCard } from "@/components/apexmind/ThoughtCard";
import { StatsPanel } from "@/components/apexmind/StatsPanel";
import { requestJson } from "@/lib/api-client";
import { toChinaDayKey, todayInChina } from "@/lib/time";
import type { ThoughtDto } from "@/types/api";

type ThoughtListResponse = {
  items: ThoughtDto[];
  nextCursor: string | null;
};

type TagSummary = { name: string; count: number };
const IMAGE_FILTER = "__images__";

export function ApexMindApp({ initialHasThoughtToday }: { initialHasThoughtToday: boolean }) {
  const [thoughts, setThoughts] = useState<ThoughtDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [hasThoughtToday, setHasThoughtToday] = useState(initialHasThoughtToday);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const loadTags = useCallback(async () => {
    try {
      setTags(await requestJson<TagSummary[]>("/api/tags"));
    } catch {
      // Tag suggestions are optional; the primary stream remains available.
    }
  }, []);

  const refreshStream = useCallback(async () => {
    setQuery("");
    setSelectedFilter("");
    setSearchOpen(false);
    setLoading(true);
    try {
      const [thoughtData, tagData] = await Promise.all([
        requestJson<ThoughtListResponse>("/api/thoughts?limit=20"),
        requestJson<TagSummary[]>("/api/tags"),
      ]);
      setThoughts(thoughtData.items);
      setNextCursor(thoughtData.nextCursor);
      setTags(tagData);
      setHasThoughtToday(
        Boolean(thoughtData.items[0] && toChinaDayKey(thoughtData.items[0].occurredAt) === todayInChina()),
      );
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "数据刷新失败");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const refreshTodayStatus = useCallback(async () => {
    try {
      const data = await requestJson<ThoughtListResponse>("/api/thoughts?limit=1");
      setHasThoughtToday(
        Boolean(data.items[0] && toChinaDayKey(data.items[0].occurredAt) === todayInChina()),
      );
    } catch {
      // The stream remains usable if the small status refresh fails.
    }
  }, []);

  const loadThoughts = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (query.trim()) params.set("q", query.trim());
    if (selectedFilter === IMAGE_FILTER) params.set("hasImages", "true");
    else if (selectedFilter) params.set("tag", selectedFilter);
    if (cursor) params.set("cursor", cursor);

    const data = await requestJson<ThoughtListResponse>(`/api/thoughts?${params}`);
    if (cursor) setThoughts((current) => [...current, ...data.items]);
    else setThoughts(data.items);
    setNextCursor(data.nextCursor);
  }, [query, selectedFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      loadThoughts()
        .catch((reason) => notify(reason instanceof Error ? reason.message : "想法加载失败"))
        .finally(() => setLoading(false));
    }, query ? 260 : 0);
    return () => clearTimeout(timer);
  }, [loadThoughts, notify, query, selectedFilter]);

  useEffect(() => {
    let active = true;
    requestJson<TagSummary[]>("/api/tags")
      .then((items) => {
        if (active) setTags(items);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try { await loadThoughts(nextCursor); }
    catch (reason) { notify(reason instanceof Error ? reason.message : "加载失败"); }
    finally { setLoadingMore(false); }
  }

  function handleCreated(thought: ThoughtDto) {
    if (!query && !selectedFilter) setThoughts((current) => [thought, ...current]);
    else { setQuery(""); setSelectedFilter(""); }
    if (toChinaDayKey(thought.occurredAt) === todayInChina()) setHasThoughtToday(true);
    void loadTags();
  }

  function handleUpdated(thought: ThoughtDto) {
    setThoughts((current) => current.map((item) => item.id === thought.id ? thought : item));
    void loadTags();
    void refreshTodayStatus();
    notify("已保存");
  }

  function handleDeleted(id: string) {
    setThoughts((current) => current.filter((item) => item.id !== id));
    void loadTags();
    void refreshTodayStatus();
    notify("已永久删除");
  }

  return (
    <div className="mind-page">
      <header className="mind-header">
        <div className="mind-header-side">
          <Link href="/" className="mind-home-button" aria-label="返回 APEXAI" title="返回 APEXAI"><BrandMark /></Link>
        </div>
        <span className="mind-title">ApexMind</span>
        <div className="mind-header-side mind-header-actions">
          <IconButton label="搜索" active={searchOpen} onClick={() => setSearchOpen((value) => !value)}><Search aria-hidden="true" /></IconButton>
          <IconButton label="统计" onClick={() => setStatsOpen(true)}><BarChart3 aria-hidden="true" /></IconButton>
        </div>
      </header>

      <main className="mind-main">
        <div className="mind-ambient" aria-hidden="true" />
        <div className="mind-column">
          {searchOpen ? (
            <section className="search-panel glass-card" aria-label="搜索和筛选">
              <Search aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索想法或标签" autoFocus aria-label="搜索关键词" />
              {query ? <button type="button" aria-label="清除搜索" onClick={() => setQuery("")}><X aria-hidden="true" /></button> : null}
            </section>
          ) : null}

          <Composer hasThoughtToday={hasThoughtToday} onCreated={handleCreated} onError={notify} />
          <nav className="thought-filters" aria-label="筛选想法">
            <button type="button" className={!selectedFilter ? "is-active" : ""} onClick={() => setSelectedFilter("")}>全部</button>
            {tags.map((tag) => (
              <button type="button" className={selectedFilter === tag.name ? "is-active" : ""} key={tag.name} onClick={() => setSelectedFilter(tag.name)}>
                {tag.name}
              </button>
            ))}
            <button type="button" className={selectedFilter === IMAGE_FILTER ? "is-active" : ""} onClick={() => setSelectedFilter(IMAGE_FILTER)}>
              图片
            </button>
          </nav>
          <div className="stream-divider" aria-hidden="true" />

          <section className="thought-stream" aria-label="过去的想法">
            {loading && !thoughts.length ? (
              <div className="stream-status"><LoaderCircle className="spin" aria-hidden="true" /> 正在加载…</div>
            ) : thoughts.length ? (
              thoughts.map((thought) => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                  onTagClick={(tag) => setSelectedFilter(tag)}
                  onError={notify}
                />
              ))
            ) : (
              <div className="empty-state">
                <BrandMark />
                <p>{query || selectedFilter ? "没有找到匹配的想法。" : "写下第一条想法，让这里慢慢生长。"}</p>
                {query || selectedFilter ? <button type="button" onClick={() => { setQuery(""); setSelectedFilter(""); }}>清除筛选</button> : null}
              </div>
            )}
            {nextCursor && !loading ? (
              <button className="load-more" type="button" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "加载中…" : "加载更多"}
              </button>
            ) : null}
          </section>
        </div>
      </main>
      <StatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} onNotify={notify} onDataChanged={refreshStream} />
      <Toast message={toast} />
    </div>
  );
}
