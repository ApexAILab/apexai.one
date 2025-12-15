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
}: {
  selectedModelId?: string;
  onTaskCreated: (taskId: string) => void;
}) {
  const { models, credentials } = useNexusStore();
  const { submitTask, isSubmitting } = useTaskEngine();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, boolean>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  
  // 使用外部传入的模型 ID，如果没有则使用内部状态
  const selectedModelId = externalModelId || "";

  // 获取当前选中的模型
  const selectedModel = models.find((m) => m.id === selectedModelId);

  // 解析模板字段
  const fields = selectedModel ? parseTemplate(selectedModel.bodyTemplate) : [];

  // 当模型改变时，重置表单并填充默认值
  useEffect(() => {
    if (!selectedModel) {
      setFormData({});
      setPreviews({});
      return;
    }

    const parsedFields = parseTemplate(selectedModel.bodyTemplate);
    const newFormData: Record<string, any> = {};
    parsedFields.forEach((field) => {
      newFormData[field.key] =
        field.defaultValue || (field.options && field.options.length > 0 ? field.options[0] : "");
    });
    setFormData(newFormData);
    setPreviews({});
  }, [selectedModel?.id, externalModelId]);

  // 处理文件上传
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
    type: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingKeys((prev) => ({ ...prev, [key]: true }));

    try {
      if (type === "file-base64") {
        // Base64 编码
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const base64 = result.split(",")[1];
          setFormData((prev) => ({ ...prev, [key]: base64 }));
          setPreviews((prev) => ({ ...prev, [key]: result }));
          setUploadingKeys((prev) => ({ ...prev, [key]: false }));
        };
        reader.readAsDataURL(file);
      } else {
        // file-url: 上传到 catbox.moe（通过后端代理避免 CORS）
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error(`上传失败(${response.status})`);

        const data = await response.json();
        const url = (data.url as string).trim();
        setFormData((prev) => ({ ...prev, [key]: url }));
        setPreviews((prev) => ({ ...prev, [key]: url }));
      }
    } catch (error) {
      console.error("上传失败:", error);
      alert("上传失败");
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
      const taskId = await submitTask(selectedModel, credential, formData);
      if (taskId) {
        onTaskCreated(taskId);
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
                  <span>立即提交任务</span>
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
