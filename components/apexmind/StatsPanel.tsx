"use client";

import { ChevronLeft, ChevronRight, Download, LoaderCircle, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Modal } from "@/components/ui/Modal";
import { IconButton } from "@/components/ui/IconButton";
import { requestJson } from "@/lib/api-client";
import { daysInMonth } from "@/lib/stats";
import type { StatsDto } from "@/types/api";

type StatsPanelProps = {
  open: boolean;
  onClose: () => void;
  onNotify: (message: string) => void;
  onDataChanged: () => Promise<void>;
};

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

type KeywordScope = StatsDto["keywordScope"];

function wordCloudStyle(index: number, count: number, maxCount: number, total: number): CSSProperties {
  if (index === 0) {
    return { left: "50%", top: "52%", fontSize: "29px", opacity: 1, zIndex: total + 1 };
  }

  const innerRing = index <= 8;
  const ringIndex = innerRing ? index - 1 : index - 9;
  const ringTotal = innerRing ? Math.min(8, Math.max(1, total - 1)) : Math.max(1, total - 9);
  const angle = -Math.PI / 2 + (ringIndex / ringTotal) * Math.PI * 2;
  const radiusX = innerRing ? 31 : 45;
  const radiusY = innerRing ? 29 : 43;
  const strength = Math.sqrt(count / Math.max(1, maxCount));
  const fontSize = innerRing ? 13 + strength * 8 : 10.5 + strength * 5;

  return {
    left: `${50 + Math.cos(angle) * radiusX}%`,
    top: `${52 + Math.sin(angle) * radiusY}%`,
    fontSize: `${fontSize}px`,
    opacity: innerRing ? 0.64 + strength * 0.28 : 0.45 + strength * 0.3,
    zIndex: total - index,
  };
}

export function StatsPanel({ open, onClose, onNotify, onDataChanged }: StatsPanelProps) {
  const [month, setMonth] = useState(currentMonth);
  const [keywordScope, setKeywordScope] = useState<KeywordScope>("month");
  const [data, setData] = useState<StatsDto | null>(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyAction, setBusyAction] = useState<"import" | "export" | "delete" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    requestJson<StatsDto>(`/api/stats?month=${month}&keywordScope=${keywordScope}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "统计数据加载失败");
      });
    return () => { active = false; };
  }, [open, month, keywordScope, refreshKey]);

  async function responseError(response: Response, fallback: string) {
    try {
      const payload = await response.json();
      return payload.error?.message || fallback;
    } catch {
      return fallback;
    }
  }

  async function handleExport() {
    setBusyAction("export");
    setError("");
    try {
      const response = await fetch("/api/data/export", { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response, "导出失败"));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ApexMind-${currentMonth()}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onNotify("已导出 Markdown");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "导出失败");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusyAction("import");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await requestJson<{ total: number; imported: number; skipped: number; unavailableImages: number }>("/api/data/import", {
        method: "POST",
        body: form,
      });
      await onDataChanged();
      setData(null);
      setRefreshKey((value) => value + 1);
      const messages = [result.imported ? `已导入 ${result.imported} 条想法` : "记录已存在"];
      if (result.skipped) messages.push(`跳过 ${result.skipped} 条重复记录`);
      if (result.unavailableImages) messages.push(`跳过 ${result.unavailableImages} 张失效图片`);
      onNotify(messages.join("；"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "导入失败");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteAll() {
    setBusyAction("delete");
    setError("");
    try {
      const result = await requestJson<{ deleted: number }>("/api/thoughts", { method: "DELETE" });
      setDeleteConfirm(false);
      await onDataChanged();
      setData(null);
      setRefreshKey((value) => value + 1);
      onNotify(`已永久删除 ${result.deleted} 条想法`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
    } finally {
      setBusyAction(null);
    }
  }

  const calendar = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: daysInMonth(month) }, (_, index) => index + 1),
    ];
  }, [month]);

  const active = new Set(data?.activeDays ?? []);
  const maxKeyword = Math.max(1, ...(data?.wordCloud.map((item) => item.count) ?? [1]));

  return (
    <Modal open={open} title="统计" onClose={onClose} className="stats-modal">
      <div className="stats-content">
        <div className="stats-toolbar" aria-label="数据管理">
          <IconButton label="导入 Markdown" onClick={() => importInputRef.current?.click()} disabled={busyAction !== null}>
            {busyAction === "import" ? <LoaderCircle className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
          </IconButton>
          <IconButton label="导出 Markdown" onClick={handleExport} disabled={busyAction !== null}>
            {busyAction === "export" ? <LoaderCircle className="spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
          </IconButton>
          <IconButton label="删除全部想法" className="stats-delete-trigger" onClick={() => setDeleteConfirm(true)} disabled={busyAction !== null}>
            <Trash2 aria-hidden="true" />
          </IconButton>
          <input ref={importInputRef} type="file" accept=".md,text/markdown,text/plain" hidden onChange={handleImport} />
        </div>
        {deleteConfirm ? (
          <div className="stats-delete-confirm">
            <span>永久删除当前账号的全部想法？</span>
            <div>
              <button type="button" className="secondary-button" onClick={() => setDeleteConfirm(false)} disabled={busyAction !== null}>取消</button>
              <button type="button" className="danger-button" onClick={handleDeleteAll} disabled={busyAction !== null}>
                {busyAction === "delete" ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        ) : null}
        <div className="stat-cards">
          <article><span>连续输出</span><strong>{data?.currentStreak ?? 0}</strong><small>天</small></article>
          <article><span>全部想法</span><strong>{(data?.totalThoughts ?? 0).toLocaleString("zh-CN")}</strong><small>条</small></article>
          <article><span>累计字数</span><strong>{(data?.totalWords ?? 0).toLocaleString("zh-CN")}</strong><small>字</small></article>
        </div>

        <div className="stats-visuals">
          <section className="heatmap-section" aria-label="输出日历">
            <div className="section-heading">
            <div className="month-switcher">
              <IconButton label="上个月" onClick={() => { setError(""); setData(null); setMonth((value) => shiftMonth(value, -1)); }}><ChevronLeft aria-hidden="true" /></IconButton>
              <span>{month.replace("-", " / ")}</span>
              <IconButton label="下个月" onClick={() => { setError(""); setData(null); setMonth((value) => shiftMonth(value, 1)); }} disabled={month >= currentMonth()}><ChevronRight aria-hidden="true" /></IconButton>
            </div>
            </div>
            <div className="calendar-weekdays" aria-hidden="true">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="activity-calendar">
              {calendar.map((day, index) => {
                const key = day ? `${month}-${String(day).padStart(2, "0")}` : `blank-${index}`;
                return day ? (
                  <div className={active.has(key) ? "is-active" : ""} key={key} title={`${key}${active.has(key) ? " · 有输出" : ""}`}>
                    {day}
                  </div>
                ) : <span key={key} />;
              })}
            </div>
          </section>

          <section className="word-cloud-section" aria-label="词云">
            <div className="word-cloud-heading">
              <div className="scope-switcher" aria-label="高频词时间范围">
                {([
                  ["month", "月"],
                  ["year", "年"],
                  ["all", "全部"],
                ] as const).map(([scope, label]) => (
                  <button
                    type="button"
                    key={scope}
                    className={keywordScope === scope ? "is-active" : ""}
                    aria-pressed={keywordScope === scope}
                    onClick={() => {
                      setError("");
                      setData(null);
                      setKeywordScope(scope);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {data?.wordCloud.length ? (
              <div className="word-cloud">
                {data.wordCloud.map((item, index) => (
                  <span
                    key={item.text}
                    style={wordCloudStyle(index, item.count, maxKeyword, data.wordCloud.length)}
                    title={`${item.text} · ${item.count} 次`}
                  >
                    {item.text}
                  </span>
                ))}
              </div>
            ) : <div className="stats-empty" aria-label="暂无词云">—</div>}
          </section>
        </div>
        {!data && !error ? <div className="stats-loading"><LoaderCircle className="spin" aria-hidden="true" /> 正在整理…</div> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
