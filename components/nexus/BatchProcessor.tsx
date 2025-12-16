"use client";

import { useState, useEffect } from "react";
import { useNexusStore } from "@/lib/store";
import { useTaskEngine } from "@/hooks/useTaskEngine";
import { parseTemplate } from "@/lib/nexus-utils";
import { Layers, Plus, Rocket, Download, FileSpreadsheet, X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

/**
 * 批量处理器组件
 * 支持批量提交任务
 * 先选模型，再填参数
 */
export function BatchProcessor({
  selectedModelId: externalModelId,
}: {
  selectedModelId?: string;
}) {
  const { models, credentials } = useNexusStore();
  const { submitTask, isSubmitting } = useTaskEngine();
  const [batchRows, setBatchRows] = useState<Record<string, any>[]>([]);
  const [uploadingStates, setUploadingStates] = useState<Record<string, boolean>>({});

  // 使用外部传入的模型 ID
  const batchModelId = externalModelId || "";

  // 获取当前选中的模型
  const batchModel = models.find((m) => m.id === batchModelId);

  // 解析批量字段
  const parsedBatchFields = batchModel
    ? parseTemplate(batchModel.bodyTemplate)
    : [];

  // 当模型改变时，清空批量行
  useEffect(() => {
    setBatchRows([]);
  }, [externalModelId]);

  // 添加一行
  const addBatchRow = () => {
    if (!batchModel) return;
    const row: Record<string, any> = {};
    parsedBatchFields.forEach((f) => {
      row[f.key] = f.defaultValue || "";
    });
    setBatchRows([...batchRows, row]);
  };

  // 删除一行
  const deleteRow = (index: number) => {
    setBatchRows(batchRows.filter((_, i) => i !== index));
  };

  // 更新行数据
  const updateRow = (index: number, key: string, value: any) => {
    const newRows = [...batchRows];
    newRows[index] = { ...newRows[index], [key]: value };
    setBatchRows(newRows);
  };

  // 处理批量任务中的文件上传
  const handleBatchUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    row: Record<string, any>,
    key: string,
    type: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadKey = `${batchRows.indexOf(row)}-${key}`;
    setUploadingStates((prev) => ({ ...prev, [uploadKey]: true }));

    try {
      if (type === "file-base64") {
        // Base64 编码
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const base64 = result.split(",")[1];
          row[key] = base64;
          setUploadingStates((prev) => ({ ...prev, [uploadKey]: false }));
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
        row[key] = url;
      }
    } catch (error) {
      console.error("上传失败:", error);
      alert("上传失败");
    } finally {
      setUploadingStates((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  // 下载模板 CSV
  const downloadTemplate = () => {
    if (!batchModel || parsedBatchFields.length === 0) return;
    const headers = parsedBatchFields.map((f) => f.key).join(",");
    const blob = new Blob([headers], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "template.csv";
    a.click();
  };

  // 导入 CSV（简化版，留接口）
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        alert("CSV 文件格式错误：至少需要表头和数据行");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const newRows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx]?.trim() || "";
        });
        newRows.push(row);
      }

      setBatchRows([...batchRows, ...newRows]);
      alert(`成功导入 ${newRows.length} 条数据`);
    };
    reader.readAsText(file);
    e.target.value = ""; // 重置 input
  };

  // 运行批量任务
  const runBatch = async () => {
    if (!batchModel || batchRows.length === 0) return;

    const credential = credentials.find(
      (c) => c.id === batchModel.credentialId
    );

    if (!credential || !credential.token) {
      alert("凭证无效：请检查模型配置");
      return;
    }

    // 循环提交每个任务
    for (const row of batchRows) {
      try {
        await submitTask(batchModel, credential, row);
        // 添加小延迟，避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("批量提交任务失败:", error);
      }
    }

    // 清空批量行
    setBatchRows([]);
    alert(`已提交 ${batchRows.length} 个任务`);
  };

  // 根据字段类型控制列宽：文本类更宽，选择类略窄
  const getColumnWidthClass = (type: string) => {
    const t = type.toLowerCase();
    if (t === "textarea" || t === "text" || t === "string" || t === "file-url" || t === "file-base64") {
      return "min-w-[220px]";
    }
    if (t === "select" || t === "boolean" || t === "bool" || t === "integer" || t === "int" || t === "number") {
      return "min-w-[140px]";
    }
    return "";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {/* 表格区域 - 只有选中模型后才显示 */}
      {batchModel ? (
        <>
          {/* 顶部工具栏 */}
          <div className="px-8 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
                  <Layers size={14} />
                  <span className="font-medium">批量任务</span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  当前模型：{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {batchModel.name}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={downloadTemplate}
                  className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-1 text-zinc-700 dark:text-zinc-300"
                >
                  <Download size={14} />
                  模板
                </button>
                <label className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-1 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <FileSpreadsheet size={14} />
                  导入CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={addBatchRow}
                  className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition font-bold flex items-center gap-1"
                >
                  <Plus size={14} />
                  添加一行
                </button>
              </div>
            </div>
          </div>

          {/* 表格内容 */}
          <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950/80 p-6">
            <div className="max-w-6xl mx-auto">
              {parsedBatchFields.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600 flex-col">
                  <p>该模型没有配置输入字段</p>
                </div>
              ) : batchRows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600 flex-col">
                  <p className="text-sm mb-1">还没有批量任务</p>
                  <p className="text-xs">点击上方「添加一行」开始配置批量作业</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900/70 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="overflow-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 bg-zinc-50/80 dark:bg-zinc-900/60">
                          <th className="p-3 font-medium w-16 text-center">序号</th>
                          {parsedBatchFields.map((f) => (
                            <th
                              key={f.key}
                              className={`p-3 font-medium text-center ${getColumnWidthClass(f.type)}`}
                            >
                              {f.label}
                            </th>
                          ))}
                          <th className="p-3 font-medium w-20 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 group align-top"
                          >
                            <td className="p-3 text-zinc-400 dark:text-zinc-500 align-middle text-center">
                              {idx + 1}
                            </td>
                            {parsedBatchFields.map((f) => (
                              <td
                                key={f.key}
                                className={`p-2 align-middle ${getColumnWidthClass(f.type)}`}
                              >
                                {f.type === "textarea" ? (
                                  <textarea
                                    value={row[f.key] || ""}
                                    onChange={(e) =>
                                      updateRow(idx, f.key, e.target.value)
                                    }
                                    rows={3}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs resize-y outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50 transition"
                                  />
                                ) : f.type === "select" ||
                                  (f.options.length > 0 &&
                                    ["string", "number", "integer", "int", "boolean", "bool", "text"].includes(
                                      f.type
                                    )) ? (
                                  <select
                                    value={row[f.key] || ""}
                                    onChange={(e) =>
                                      updateRow(idx, f.key, e.target.value)
                                    }
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50 transition"
                                  >
                                    {f.options.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : f.type === "file-url" || f.type === "file-base64" ? (
                                  <div className="space-y-2">
                                    <div className="relative flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={row[f.key] || ""}
                                        onChange={(e) =>
                                          updateRow(idx, f.key, e.target.value)
                                        }
                                        className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs outline-none truncate focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50 transition"
                                        placeholder={f.type}
                                      />
                                      <label className="cursor-pointer text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition p-1">
                                        {uploadingStates[`${idx}-${f.key}`] ? (
                                          <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                          <Upload size={14} />
                                        )}
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept="image/*"
                                          onChange={(e) =>
                                            handleBatchUpload(e, row, f.key, f.type)
                                          }
                                        />
                                      </label>
                                    </div>
                                    {row[f.key] && f.type === "file-url" && (
                                      <div className="flex items-start gap-2 pt-1">
                                        <a
                                          href={row[f.key]}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block w-20 h-12 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0"
                                        >
                                          <img
                                            src={row[f.key]}
                                            alt="preview"
                                            className="max-w-full max-h-full object-cover"
                                          />
                                        </a>
                                        <div className="flex-1 min-w-0">
                                          <a
                                            href={row[f.key]}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block text-[10px] text-zinc-500 dark:text-zinc-400 break-all hover:underline"
                                          >
                                            {row[f.key]}
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : ["number", "integer", "int", "boolean", "bool"].includes(
                                    f.type
                                  ) && f.options.length > 0 ? null : (
                                  <input
                                    type={
                                      ["number", "integer", "int"].includes(f.type)
                                        ? "number"
                                        : "text"
                                    }
                                    value={row[f.key] ?? ""}
                                    onChange={(e) =>
                                      updateRow(
                                        idx,
                                        f.key,
                                        ["number", "integer", "int"].includes(f.type)
                                          ? e.target.value
                                          : e.target.value
                                      )
                                    }
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 text-zinc-900 dark:text-zinc-50 transition"
                                  />
                                )}
                              </td>
                            ))}
                            <td className="p-3 text-center align-middle">
                              <button
                                onClick={() => deleteRow(idx)}
                                className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                共 {batchRows.length} 个任务
              </div>
              <button
                onClick={runBatch}
                disabled={batchRows.length === 0 || isSubmitting}
                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>提交中...</span>
                  </>
                ) : (
                  <>
                    <Rocket size={16} />
                    <span>全部提交</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-zinc-400 dark:text-zinc-600">
            <p className="text-base">请先选择模型</p>
            <p className="text-sm mt-1">选择模型后，将显示批量作业表格</p>
          </div>
        </div>
      )}
    </div>
  );
}
