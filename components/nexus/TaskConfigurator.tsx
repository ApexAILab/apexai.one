"use client";

import { useState, useEffect } from "react";
import { useNexusStore } from "@/lib/store";
import { useTaskEngine } from "@/hooks/useTaskEngine";
import { parseTemplate } from "@/lib/nexus-utils";
import { Rocket, Image, Upload, Loader2 } from "lucide-react";

/**
 * 任务配置器组件
 * 根据模型模板动态渲染输入表单
 * 先选模型，再填参数
 */
export function TaskConfigurator({
  selectedModelId: externalModelId,
  onTaskCreated,
  initialFormData,
  onTaskSubmitted,
}: {
  selectedModelId?: string;
  onTaskCreated?: (taskId: string) => void;
  initialFormData?: Record<string, any>; // 初始表单数据，用于重新编辑
  onTaskSubmitted?: () => void; // 任务提交成功后的回调，用于清空初始数据
}) {
  const { models, credentials } = useNexusStore();
  const { submitTask, isSubmitting } = useTaskEngine();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, boolean>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [autoDownload, setAutoDownload] = useState<boolean>(true); // 默认勾选自动下载
  const [submitCount, setSubmitCount] = useState<number>(1); // 提交次数，默认1次
  
  // 使用外部传入的模型 ID，如果没有则使用内部状态
  const selectedModelId = externalModelId || "";

  // 获取当前选中的模型
  const selectedModel = models.find((m) => m.id === selectedModelId);

  // 解析模板字段
  const fields = selectedModel ? parseTemplate(selectedModel.bodyTemplate) : [];

  // 当模型改变时，重置表单并填充默认值或初始数据
  useEffect(() => {
    if (!selectedModel) {
      setFormData({});
      setPreviews({});
      return;
    }

    const parsedFields = parseTemplate(selectedModel.bodyTemplate);
    const newFormData: Record<string, any> = {};
    const newPreviews: Record<string, string> = {};
    
    parsedFields.forEach((field) => {
      // 如果有初始数据，优先使用初始数据；否则使用默认值
      if (initialFormData && initialFormData[field.key] !== undefined) {
        newFormData[field.key] = initialFormData[field.key];
        // 如果是文件类型（URL 或 base64），设置预览
        if (field.type === "file-url" || field.type === "file-base64") {
          const value = initialFormData[field.key];
          if (value) {
            if (field.type === "file-base64" && typeof value === "string") {
              // Base64 数据，需要添加 data:image 前缀用于预览
              newPreviews[field.key] = `data:image/png;base64,${value}`;
            } else if (field.type === "file-url" && typeof value === "string") {
              // URL，直接使用
              newPreviews[field.key] = value;
            }
          }
        }
      } else {
        newFormData[field.key] =
          field.defaultValue || (field.options && field.options.length > 0 ? field.options[0] : "");
      }
    });
    
    setFormData(newFormData);
    setPreviews(newPreviews);
  }, [selectedModel?.id, externalModelId, initialFormData]);

  // 处理文件上传
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
    type: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件大小（最大 100MB）
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert(`文件大小超过限制（最大 100MB），当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setUploadingKeys((prev) => ({ ...prev, [key]: true }));

    try {
      if (type === "file-base64") {
        // Base64 编码
        // 对于大文件，Base64 编码会增加约 33% 的大小，所以限制更小
        const base64MaxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > base64MaxSize) {
          throw new Error(`Base64 编码模式下，文件大小不能超过 10MB，当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB`);
        }
        
        // 使用 Promise 包装 FileReader，以便正确捕获错误
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const result = event.target?.result as string;
              if (!result) {
                reject(new Error("文件读取结果为空"));
                return;
              }
              const base64 = result.split(",")[1];
              setFormData((prev) => ({ ...prev, [key]: base64 }));
              setPreviews((prev) => ({ ...prev, [key]: result }));
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => {
            reject(new Error("文件读取失败，请检查文件是否损坏"));
          };
          reader.onabort = () => {
            reject(new Error("文件读取被中断"));
          };
          reader.readAsDataURL(file);
        });
      } else {
        // file-url: 上传到服务器（通过后端代理避免 CORS）
        const formData = new FormData();
        formData.append("file", file);

        // 显示上传进度提示
        console.log(`开始上传文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = `上传失败(${response.status})`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // 如果无法解析 JSON，尝试读取文本
            try {
              const text = await response.text();
              if (text) {
                // 尝试从文本中提取错误信息
                try {
                  const parsed = JSON.parse(text);
                  errorMessage = parsed.error || errorMessage;
                } catch {
                  errorMessage = text.substring(0, 200); // 限制长度
                }
              }
            } catch (e2) {
              // 忽略
            }
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (!data.url) {
          throw new Error(data.error || "上传失败：未返回文件 URL");
        }
        
        const url = (data.url as string).trim();
        if (!url || url === '') {
          throw new Error("上传失败：返回的 URL 为空");
        }
        
        console.log(`上传成功: ${url}`);
        setFormData((prev) => ({ ...prev, [key]: url }));
        setPreviews((prev) => ({ ...prev, [key]: url }));
      }
    } catch (error) {
      console.error("上传失败:", error);
      const errorMessage = error instanceof Error ? error.message : "上传失败，请重试";
      // 使用更明显的错误提示
      alert(`❌ ${errorMessage}`);
      // 清空可能的部分上传状态
      setFormData((prev) => {
        const newData = { ...prev };
        delete newData[key];
        return newData;
      });
      setPreviews((prev) => {
        const newPreviews = { ...prev };
        delete newPreviews[key];
        return newPreviews;
      });
    } finally {
      setUploadingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  // 处理表单提交
  const handleSubmit = async () => {
    if (!selectedModel) {
      alert("请先选择一个模型");
      return;
    }

    const credential = credentials.find(
      (c) => c.id === selectedModel.credentialId
    );

    if (!credential || !credential.token) {
      alert("凭证无效：请检查模型配置");
      return;
    }

    try {
      // 根据提交次数，循环提交任务
      const taskIds: string[] = [];
      for (let i = 0; i < submitCount; i++) {
        try {
          const taskId = await submitTask(selectedModel, credential, formData, autoDownload);
          if (taskId) {
            taskIds.push(taskId);
          }
          // 如果不是最后一次提交，稍微延迟一下，避免请求过快
          if (i < submitCount - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`第 ${i + 1} 次提交任务失败:`, error);
          // 继续提交剩余次数，不中断整个流程
        }
      }

      // 如果至少有一个任务提交成功
      if (taskIds.length > 0) {
        // 任务提交成功后，清空初始数据（这样下次打开表单时不会保留旧数据）
        if (onTaskSubmitted) {
          onTaskSubmitted();
        }
        if (onTaskCreated && taskIds.length === 1) {
          // 只有在提供了 onTaskCreated 回调且只提交了一个任务时才调用，否则不跳转
          onTaskCreated(taskIds[0]);
        }
      } else {
        alert("所有任务提交失败，请查看控制台");
      }
    } catch (error) {
      console.error("提交任务失败:", error);
      alert("提交任务失败，请查看控制台");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 动态表单区域 - 只有选中模型后才显示 */}
        {selectedModel ? (
          <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6 shadow-sm">

            {fields.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                该模型没有配置输入字段
              </p>
            ) : (
              fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                    {field.label}
                  </label>

                  {/* 下拉选择：select，或带选项的 string/number/boolean */}
                  {(field.type === "select" ||
                    (field.options.length > 0 &&
                      ["string", "number", "integer", "int", "boolean", "bool", "text"].includes(
                        field.type
                      ))) && (
                    <select
                      value={formData[field.key] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.value })
                      }
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition"
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Textarea 类型 */}
                  {field.type === "textarea" && (
                    <textarea
                      value={formData[field.key] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.key]: e.target.value })
                      }
                      rows={4}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition resize-none"
                      placeholder={`输入 ${field.label}...`}
                    />
                  )}

                  {/* 文件上传类型 (file-url 或 file-base64) */}
                  {(field.type === "file-url" || field.type === "file-base64") && (
                    <div className="space-y-2">
                      <div className="relative flex items-center">
                        {field.type === "file-url" ? (
                          <input
                            type="text"
                            value={formData[field.key] || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, [field.key]: e.target.value })
                            }
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pl-10 pr-24 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition"
                            placeholder="HTTPS 链接"
                          />
                        ) : (
                          <input
                            type="text"
                            value="Base64 Data"
                            disabled
                            className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pl-10 pr-24 text-sm text-zinc-400 dark:text-zinc-600"
                          />
                        )}
                        <Image
                          size={18}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                        />
                        <label className="absolute right-2 top-2 bottom-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 flex items-center rounded-lg cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-100 transition text-xs font-bold shadow-sm">
                          {uploadingKeys[field.key] ? (
                            <Loader2 size={14} className="mr-1 animate-spin" />
                          ) : (
                            <Upload size={14} className="mr-1" />
                          )}
                          <span>{uploadingKeys[field.key] ? "..." : "上传"}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleUpload(e, field.key, field.type)}
                          />
                        </label>
                      </div>
                      {/* 图片预览 */}
                      {(previews[field.key] || (field.type === "file-url" && formData[field.key])) && (
                        <div className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
                          <img
                            src={previews[field.key] || formData[field.key]}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 普通文本/数字输入 */}
                  {field.type !== "select" &&
                    field.type !== "textarea" &&
                    field.type !== "file-url" &&
                    field.type !== "file-base64" &&
                    !(
                      ["number", "integer", "int", "boolean", "bool"].includes(field.type) &&
                      field.options.length > 0
                    ) && (
                      <input
                        type={
                          ["number", "integer", "int"].includes(field.type)
                            ? "number"
                            : "text"
                        }
                        value={formData[field.key] ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [field.key]:
                              ["number", "integer", "int"].includes(field.type)
                                ? e.target.value
                                : e.target.value,
                          })
                        }
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition"
                        placeholder={`输入 ${field.label}...`}
                      />
                    )}
                </div>
              ))
            )}

            {/* 提交选项 */}
            <div className="flex items-center gap-6 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {/* 自动下载选项 */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={autoDownload}
                  onChange={(e) => setAutoDownload(e.target.checked)}
                  className="w-4 h-4 rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition checked:bg-zinc-900 dark:checked:bg-white"
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition">
                  自动下载
                </span>
              </label>

              {/* 分隔线 */}
              <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

              {/* 提交次数 */}
              <div className="flex items-center gap-2.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  提交次数
                </label>
                <div className="relative">
                  <select
                    data-submit-count="true"
                    value={submitCount}
                    onChange={(e) => setSubmitCount(Number(e.target.value))}
                    className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition hover:border-zinc-300 dark:hover:border-zinc-600 appearance-none cursor-pointer"
                    style={{
                      height: '1.75rem',
                      width: '4rem',
                      lineHeight: '1.75rem',
                      textAlign: 'center',
                      textAlignLast: 'center',
                      paddingLeft: '0',
                      paddingRight: '1.25rem',
                      paddingTop: '0',
                      paddingBottom: '0',
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option 
                        key={num} 
                        value={num}
                        style={{
                          textAlign: 'center',
                        }}
                      >
                        {num}
                      </option>
                    ))}
                  </select>
                  {/* 自定义下拉箭头 */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-zinc-400 dark:text-zinc-500">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* 提交按钮 */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-zinc-900/10"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span>提交中...</span>
                </>
              ) : (
                <>
                  <Rocket size={20} />
                  <span>
                    {submitCount === 1 ? "立即提交任务" : `提交 ${submitCount} 个任务`}
                  </span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 shadow-sm">
            <div className="text-center text-zinc-400 dark:text-zinc-600">
              <p className="text-base">请先选择模型</p>
              <p className="text-sm mt-1">选择模型后，将显示对应的输入字段</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
