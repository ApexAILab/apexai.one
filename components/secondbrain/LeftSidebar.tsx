"use client";

import { useState, useEffect } from "react";
import { Calendar, FileText, Loader2 } from "lucide-react";

interface LeftSidebarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  selectedPostId: string | null;
  onSelectPost: (postId: string | null) => void;
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
}

/**
 * 左侧栏组件
 * 包含：热力图 + 帖子列表（只显示头几个字）
 */
export function LeftSidebar({
  selectedDate,
  onSelectDate,
  selectedPostId,
  onSelectPost,
}: LeftSidebarProps) {
  const [calendarDates, setCalendarDates] = useState<Set<string>>(new Set());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取日历数据
  const fetchCalendar = async () => {
    try {
      const response = await fetch('/api/posts/calendar');
      const result = await response.json();
      if (result.success) {
        setCalendarDates(new Set(result.data));
      }
    } catch (error) {
      console.error('Fetch calendar error:', error);
    }
  };

  // 获取帖子列表
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/posts?limit=20');
      const result = await response.json();
      if (result.success) {
        setPosts(result.data);
      }
    } catch (error) {
      console.error('Fetch posts error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    fetchPosts();
  }, []);

  // 监听外部刷新（通过 key 变化触发）
  useEffect(() => {
    fetchCalendar();
    fetchPosts();
  }, []);

  // 生成当月日历数据
  const generateCurrentMonthCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const firstDayOfWeek = firstDay.getDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    const calendar: Array<{ date: Date | null; hasPost: boolean }> = [];
    
    for (let i = 0; i < startOffset; i++) {
      calendar.push({ date: null, hasPost: false });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      calendar.push({
        date,
        hasPost: calendarDates.has(dateKey),
      });
    }
    
    return calendar;
  };

  const calendarData = generateCurrentMonthCalendar();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  const getMonthName = (monthIndex: number) => {
    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    return months[monthIndex];
  };

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

  return (
    <div className="w-80 flex flex-col gap-2 overflow-hidden">
      {/* 热力图区域 - 精致小巧版本 */}
      <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 p-2 shadow-sm">
        <div className="mb-1.5">
          <h3 className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            {currentYear}年{getMonthName(currentMonth)}
          </h3>
        </div>
        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-[8px] text-zinc-400 dark:text-zinc-500">
              {day}
            </div>
          ))}
        </div>
        {/* 日历格子 */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarData.map((item, idx) => {
            if (!item.date) {
              return <div key={idx} className="h-2.5" />;
            }
            const isSelected = selectedDate && item.date.toDateString() === selectedDate.toDateString();
            const isToday = item.date.toDateString() === today.toDateString();
            return (
              <button
                key={idx}
                onClick={() => onSelectDate(item.date!)}
                className={`h-2.5 rounded-[2px] transition-all hover:ring-1 hover:ring-zinc-900 dark:hover:ring-zinc-50 ${
                  item.hasPost
                    ? "bg-zinc-900 dark:bg-zinc-50"
                    : "bg-zinc-100 dark:bg-zinc-900"
                } ${isSelected ? "ring-1 ring-zinc-900 dark:ring-zinc-50" : ""} ${
                  isToday ? "border border-zinc-400 dark:border-zinc-600" : ""
                }`}
                title={`${item.date.toLocaleDateString()}: ${item.hasPost ? "有帖子" : "无帖子"}`}
              />
            );
          })}
        </div>
      </div>

      {/* 帖子列表 */}
      <div className="flex-1 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          <FileText size={16} className="text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">最近帖子</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-zinc-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-4 text-zinc-400 dark:text-zinc-500 text-xs">
              暂无帖子
            </div>
          ) : (
            posts.map((post) => {
              const isSelected = selectedPostId === post.id;
              const postDate = new Date(post.createdAt);
              const preview = post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content;
              return (
                <button
                  key={post.id}
                  onClick={() => onSelectPost(post.id)}
                  className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-all ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <div className="truncate">{preview}</div>
                  <div className={`text-[10px] mt-1 ${isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {postDate.toLocaleDateString()}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
