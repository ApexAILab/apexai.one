"use client";

import { useState } from "react";
import { Settings, Search, Send, Bot } from "lucide-react";
import { SettingsDialog } from "./SettingsDialog";

interface RightSidebarProps {
  onSearchChange?: (query: string) => void;
}

/**
 * 右侧栏组件
 * 包含：设置按钮 + 搜索栏 + AI 对话对话框
 */
export function RightSidebar({ onSearchChange }: RightSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setMessages([...messages, { role: "user", content: inputMessage }]);
      setInputMessage("");
      // TODO: 调用 AI API 获取回复
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "这是一个 AI 回复的示例。实际功能将在后续实现。" },
        ]);
      }, 500);
    }
  };

  return (
    <div className="w-full lg:w-80 flex flex-col gap-2 overflow-hidden">
      {/* 设置按钮 */}
      <button
        onClick={() => setShowSettings(true)}
        className="h-12 sm:h-11 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 px-3 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 active:scale-95"
      >
        <Settings size={18} className="sm:w-4 sm:h-4" />
        <span>设置</span>
      </button>

      {/* 设置弹窗 */}
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />

      {/* 搜索栏 */}
      <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 p-3 shadow-sm">
        <div className="relative h-12 sm:h-11 flex items-center">
          <Search size={18} className="absolute left-3 sm:left-2 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 sm:w-4 sm:h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const newQuery = e.target.value;
              setSearchQuery(newQuery);
              onSearchChange?.(newQuery);
            }}
            placeholder="搜索帖子..."
            className="w-full h-full pl-10 sm:pl-8 pr-3 bg-transparent border-none outline-none text-base sm:text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* AI 对话对话框 */}
      <div className="flex-1 rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          <Bot size={16} className="text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">AI 助手</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-8">
              开始与 AI 对话，了解你的历史想法
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-sm px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="输入消息..."
              className="flex-1 bg-transparent border-none outline-none text-sm sm:text-xs text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="p-2 sm:p-1.5 rounded-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <Send size={16} className="sm:w-[14px] sm:h-[14px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
