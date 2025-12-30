"use client";

import { useState, useEffect } from "react";
import { LeftSidebar } from "@/components/secondbrain/LeftSidebar";
import { MainContent } from "@/components/secondbrain/MainContent";
import { RightSidebar } from "@/components/secondbrain/RightSidebar";
import { Menu, X, Calendar, Search, Settings } from "lucide-react";

/**
 * SecondBrain 主页面
 * 桌面端：三栏式布局（左侧栏 + 中间内容区 + 右侧栏）
 * 移动端：单栏布局，使用底部导航栏切换视图
 */
export default function SecondBrainPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // 移动端视图状态
  const [mobileView, setMobileView] = useState<"main" | "left" | "right">("main");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // 监听窗口大小变化，自动切换布局
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // 桌面端：显示所有栏
        setMobileView("main");
        setShowMobileMenu(false);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // 初始检查

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pt-16 pb-16 sm:pb-2">
      {/* 桌面端布局 */}
      <div className="hidden lg:block mx-auto max-w-[1920px] pt-2 px-2 pb-2 h-[calc(100vh-4rem-0.5rem-0.5rem)]">
        <div className="flex h-full gap-2">
          {/* 左侧栏 */}
          <LeftSidebar
            key={refreshKey}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            selectedPostId={selectedPostId}
            onSelectPost={setSelectedPostId}
          />

          {/* 中间内容区 */}
          <MainContent
            selectedDate={selectedDate}
            selectedPostId={selectedPostId}
            onRefresh={handleRefresh}
            searchQuery={searchQuery}
          />

          {/* 右侧栏 */}
          <RightSidebar onSearchChange={setSearchQuery} />
        </div>
      </div>

      {/* 移动端布局 */}
      <div className="lg:hidden h-[calc(100vh-4rem)] overflow-hidden">
        {/* 移动端主内容区 */}
        {mobileView === "main" && (
          <div className="h-full overflow-y-auto px-2 py-2">
            <MainContent
              selectedDate={selectedDate}
              selectedPostId={selectedPostId}
              onRefresh={handleRefresh}
              searchQuery={searchQuery}
            />
          </div>
        )}

        {/* 移动端左侧栏（日历和帖子列表） */}
        {mobileView === "left" && (
          <div className="h-full overflow-y-auto px-2 py-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">日历与帖子</h2>
              <button
                onClick={() => setMobileView("main")}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <LeftSidebar
              key={refreshKey}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setMobileView("main"); // 选择日期后返回主视图
              }}
              selectedPostId={selectedPostId}
              onSelectPost={(postId) => {
                setSelectedPostId(postId);
                setMobileView("main"); // 选择帖子后返回主视图
              }}
            />
          </div>
        )}

        {/* 移动端右侧栏（搜索和设置） */}
        {mobileView === "right" && (
          <div className="h-full overflow-y-auto px-2 py-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">搜索与设置</h2>
              <button
                onClick={() => setMobileView("main")}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <RightSidebar onSearchChange={(query) => {
              setSearchQuery(query);
              setMobileView("main"); // 搜索后返回主视图
            }} />
          </div>
        )}

        {/* 移动端底部导航栏 */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 lg:hidden">
          <div className="flex items-center justify-around h-16 px-2">
            <button
              onClick={() => setMobileView("left")}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-colors ${
                mobileView === "left"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              <Calendar size={20} />
              <span className="text-xs">日历</span>
            </button>
            <button
              onClick={() => setMobileView("main")}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-colors ${
                mobileView === "main"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              <Menu size={20} />
              <span className="text-xs">帖子</span>
            </button>
            <button
              onClick={() => setMobileView("right")}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-colors ${
                mobileView === "right"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              <Search size={20} />
              <span className="text-xs">搜索</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
