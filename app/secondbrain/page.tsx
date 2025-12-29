"use client";

import { useState } from "react";
import { LeftSidebar } from "@/components/secondbrain/LeftSidebar";
import { MainContent } from "@/components/secondbrain/MainContent";
import { RightSidebar } from "@/components/secondbrain/RightSidebar";

/**
 * SecondBrain 主页面
 * 三栏式布局：左侧栏 + 中间内容区 + 右侧栏
 */
export default function SecondBrainPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pt-16 pb-2">
      <div className="mx-auto max-w-[1920px] pt-2 px-2 pb-2 h-[calc(100vh-4rem-0.5rem-0.5rem)]">
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
    </div>
  );
}
