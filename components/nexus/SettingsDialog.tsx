"use client";

import { useState } from "react";
import { useNexusStore } from "@/lib/store";
import type { Credential, Model } from "@/types/nexus";
import { X, Trash2, Plus } from "lucide-react";

/**
 * 设置弹窗组件
 * 管理凭证和模型配置
 * Bento/Apple 设计风格
 */
export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    credentials,
    models,
    addCredential,
    updateCredential,
    deleteCredential,
    addModel,
    updateModel,
    deleteModel,
  } = useNexusStore();

  const [settingTab, setSettingTab] = useState<"creds" | "models">("creds");
  const [showDocs, setShowDocs] = useState(false);

  // 生成唯一 ID（使用时间戳 + 随机数，避免 hydration 问题）
  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 创建新凭证
  const createNewCredential = () => {
    const newCred: Credential = {
      id: generateId(),
      name: "New Key",
      baseUrl: "",
      token: "",
    };
    addCredential(newCred);
  };

  // 创建新模型
  const createNewModel = () => {
    const newModel: Model = {
      id: generateId(),
      credentialId: credentials.length > 0 ? credentials[0].id : "",
      name: "New Model",
      createPath: "/v1/create",
      queryPath: "",
      paths: {
        taskId: "",
        status: "",
        outputUrl: "",
      },
      bodyTemplate: '{\n  "prompt": "{{Prompt:textarea}}"\n}',
    };
    addModel(newModel);
  };

  // 导出配置
  const handleExport = () => {
    const data = {
      credentials,
      models,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nexus-config.json";
    a.click();
  };

  // 导入配置
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.credentials) {
          data.credentials.forEach((c: Credential) => addCredential(c));
        }
        if (data.models) {
          data.models.forEach((m: Model) => addModel(m));
        }
        alert("导入成功");
      } catch (error) {
        alert("导入失败：文件格式错误");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // 重置所有配置
  const clearConfig = () => {
    if (confirm("确定重置所有配置？此操作不可恢复！")) {
      credentials.forEach((c) => deleteCredential(c.id));
      models.forEach((m) => deleteModel(m.id));
      alert("已重置所有配置");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 - 黑色半透明 + 高强度毛玻璃 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* 弹窗主体 - 居中，白色背景，深色阴影，圆角，极细边框 */}
      <div className="relative z-10 bg-white dark:bg-zinc-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {settingTab === "creds" ? "凭证管理" : "模型管理"}
            </h2>
            {/* Tab 切换器 */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setSettingTab("creds")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  settingTab === "creds"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                凭证
              </button>
              <button
                onClick={() => setSettingTab("models")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  settingTab === "models"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                模型
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 操作按钮：说明、导入、导出、重置 */}
            <button
              onClick={() => setShowDocs(true)}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              说明
            </button>
            <label className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer">
              导入
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              导出
            </button>
            <button
              onClick={clearConfig}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            >
              重置
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 凭证管理 */}
          {settingTab === "creds" && (
            <div className="space-y-4">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 relative group hover:shadow-sm transition-shadow"
                >
                  <button
                    onClick={() => {
                      if (confirm("确认删除此凭证？")) {
                        deleteCredential(cred.id);
                      }
                    }}
                    className="absolute top-4 right-4 text-zinc-400 dark:text-zinc-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                        Name
                      </label>
                      <input
                        value={cred.name}
                        onChange={(e) =>
                          updateCredential(cred.id, { name: e.target.value })
                        }
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                        Base URL
                      </label>
                      <input
                        value={cred.baseUrl}
                        onChange={(e) =>
                          updateCredential(cred.id, {
                            baseUrl: e.target.value,
                          })
                        }
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                        Token
                      </label>
                      <input
                        value={cred.token}
                        onChange={(e) =>
                          updateCredential(cred.id, { token: e.target.value })
                        }
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={createNewCredential}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition font-medium"
              >
                <Plus size={18} />
                <span>添加凭证</span>
              </button>
            </div>
          )}

          {/* 模型管理 */}
          {settingTab === "models" && (
            <div className="space-y-4">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 relative group hover:shadow-sm transition-shadow"
                >
                  <button
                    onClick={() => {
                      if (confirm("确认删除此模型？")) {
                        deleteModel(model.id);
                      }
                    }}
                    className="absolute top-4 right-4 text-zinc-400 dark:text-zinc-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                        Model Name
                      </label>
                      <input
                        value={model.name}
                        onChange={(e) =>
                          updateModel(model.id, { name: e.target.value })
                        }
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                        Credential
                      </label>
                      <select
                        value={model.credentialId}
                        onChange={(e) =>
                          updateModel(model.id, {
                            credentialId: e.target.value,
                          })
                        }
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                      >
                        {credentials.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                          POST Path
                        </label>
                        <input
                          value={model.createPath}
                          onChange={(e) =>
                            updateModel(model.id, {
                              createPath: e.target.value,
                            })
                          }
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                          Query Path
                        </label>
                        <input
                          value={model.queryPath}
                          onChange={(e) =>
                            updateModel(model.id, {
                              queryPath: e.target.value,
                            })
                          }
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 grid grid-cols-3 gap-2">
                      <input
                        value={model.paths.taskId}
                        onChange={(e) =>
                          updateModel(model.id, {
                            paths: { ...model.paths, taskId: e.target.value },
                          })
                        }
                        placeholder="Task ID Path"
                        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                      />
                      <input
                        value={model.paths.status}
                        onChange={(e) =>
                          updateModel(model.id, {
                            paths: { ...model.paths, status: e.target.value },
                          })
                        }
                        placeholder="Status Path"
                        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                      />
                      <input
                        value={model.paths.outputUrl}
                        onChange={(e) =>
                          updateModel(model.id, {
                            paths: {
                              ...model.paths,
                              outputUrl: e.target.value,
                            },
                          })
                        }
                        placeholder="Output URL Path"
                        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 transition text-zinc-900 dark:text-zinc-50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                        JSON Template
                      </label>
                      <textarea
                        value={model.bodyTemplate}
                        onChange={(e) =>
                          updateModel(model.id, {
                            bodyTemplate: e.target.value,
                          })
                        }
                        className="w-full h-32 bg-zinc-900 dark:bg-black text-zinc-300 dark:text-zinc-400 rounded-lg p-3 text-xs font-mono leading-relaxed resize-none outline-none border border-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-700 dark:focus:ring-zinc-600 transition"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={createNewModel}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition font-medium"
              >
                <Plus size={18} />
                <span>添加模型</span>
              </button>
            </div>
          )}
        </div>

        {/* 请求体语法说明弹层 */}
        {showDocs && (
          <div className="absolute inset-0 z-20 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-3xl w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  请求体模板语法说明
                </h3>
                <button
                  onClick={() => setShowDocs(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition text-zinc-500 dark:text-zinc-400"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                <p>
                  模板占位符统一使用{" "}
                  <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                    {"{{字段名:类型:选项1,选项2|默认值}}"}
                  </code>{" "}
                  的格式，后端会根据类型自动转换为正确的 JSON。
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <span className="font-semibold">文本/字符串：</span>
                    <code>{"{{提示词:textarea}}"}</code>、{" "}
                    <code>{"{{标题:text|Untitled}}"}</code>
                  </li>
                  <li>
                    <span className="font-semibold">下拉选择（字符串）：</span>
                    <code>{"{{尺寸:select:small,large|large}}"}</code>
                  </li>
                  <li>
                    <span className="font-semibold">整数/数字：</span>
                    <code>{"{{duration:integer|10}}"}</code>{" "}
                    → JSON 中为数字 <code>10</code>
                    ，带选项时：
                    <code>{"{{duration:integer:10,15|10}}"}</code> 会渲染为下拉框。
                  </li>
                  <li>
                    <span className="font-semibold">布尔值：</span>
                    <code>{"{{watermark:boolean:true,false|true}}"}</code>{" "}
                    → JSON 中为 <code>true / false</code>。
                  </li>
                  <li>
                    <span className="font-semibold">文件：</span>
                    <code>{"{{参考图:file-url}}"}</code>（上传后得到 HTTPS
                    链接），或 <code>{"{{参考图:file-base64}}"}</code>{" "}
                    （Base64 编码）。
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
