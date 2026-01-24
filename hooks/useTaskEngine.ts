"use client";

import { useState } from "react";
import { useNexusStore } from "@/lib/store";
import { parseTemplate, cleanJSON } from "@/lib/nexus-utils";
import type { Model, Credential, Task } from "@/types/nexus";

/**
 * 获取嵌套对象的值
 * 支持点号分隔的路径，如 "data.task_id"
 */
function getNested(obj: any, path: string | undefined): any {
  if (!path) return undefined;
  return path.split(".").reduce((a, b) => a && a[b], obj);
}

/**
 * 判断是否为视频文件
 */
function isVideo(url: string | null): boolean {
  if (!url) return false;
  return url.includes(".mp4") || url.includes(".mov") || url.includes(".webm") || url.includes(".avi");
}

/**
 * 自动下载文件
 * 通过服务端代理下载，避免浏览器阻止弹出窗口
 */
async function autoDownloadFile(url: string, filename?: string) {
  try {
    // 通过服务端代理下载文件
    const downloadUrl = `/api/nexus/download?url=${encodeURIComponent(url)}`;
    
    // 使用 fetch 获取文件
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }
    
    // 获取文件 blob
    const blob = await response.blob();
    
    // 创建 Blob URL
    const blobUrl = URL.createObjectURL(blob);
    
    // 创建下载链接并触发下载
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename || url.split("/").pop() || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理 Blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error("自动下载失败:", error);
    // 如果代理下载失败，尝试直接下载（可能会被浏览器阻止）
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || url.split("/").pop() || "download";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (fallbackError) {
      console.error("直接下载也失败:", fallbackError);
    }
  }
}

/**
 * 添加日志到任务
 */
function addLog(
  taskId: string,
  msg: string,
  type: "error" | "success" | "info" | "debug" | "warning" = "info",
  detail: string | null = null
) {
  const log = {
    time: new Date().toLocaleTimeString(),
    msg,
    type,
    detail,
  };
  
  // 获取最新任务状态
  const currentTask = useNexusStore.getState().tasks.find((t) => t.id === taskId);
  if (!currentTask) return;
  
  // 若为状态日志且与最近一条相同，则不重复记录
  const extractStatus = (text: string) => {
    const match = text.match(/状态[:：]\s*(.+)$/);
    return match ? match[1].trim() : null;
  };
  const currentStatus = extractStatus(msg);
  if (currentStatus) {
    const last = currentTask.logs[0];
    const lastStatus = last ? extractStatus(last.msg) : null;
    if (lastStatus && lastStatus === currentStatus) {
      return;
    }
  }

  // 更新任务日志（添加到最前面）
  useNexusStore.getState().updateTask(taskId, {
    logs: [log, ...currentTask.logs],
  });
}

/**
 * 任务引擎 Hook
 * 处理任务提交和轮询逻辑
 */
export function useTaskEngine() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addTask, updateTask } = useNexusStore();

  /**
   * 提交任务
   * 独立的异步函数，包含完整的任务处理逻辑
   */
  const submitTask = async (
    model: Model,
    credential: Credential,
    inputs: Record<string, any>,
    autoDownload: boolean = true
  ): Promise<string | null> => {
    setIsSubmitting(true);

    try {
      // 验证凭证
      if (!credential.token) {
        throw new Error("凭证无效：缺少 token");
      }

      // 创建新任务
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        modelId: model.id,
        modelName: model.name,
        startTime: Date.now(),
        status: "polling",
        inputs: JSON.parse(JSON.stringify(inputs)),
        logs: [],
        result: null,
        summary: inputs["prompt"] || inputs["提示词"] || "Task",
        autoDownload, // 保存自动下载选项
      };

      // 添加到 store
      addTask(newTask);

      // 开始处理任务
      await runTaskProcessor(newTask, model, credential);

      return newTask.id;
    } catch (error) {
      console.error("提交任务失败:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 任务处理器
   * 复刻原始 runTaskProcessor 逻辑
   */
  async function runTaskProcessor(
    task: Task,
    model: Model,
    cred: Credential
  ): Promise<void> {
    try {
      // 1. 解析模板并替换占位符
      let bodyStr = model.bodyTemplate;
      const fields = parseTemplate(model.bodyTemplate);

      fields.forEach((f) => {
        let val = task.inputs[f.key];
        // 处理未填写的图片：如果是空值，设为 "" (空字符串)
        if (val === undefined || val === null) val = "";
        
        // 类型转换：数字/整数/布尔
        const t = (f.type || "").toLowerCase();
        if (t === "number" || t === "integer" || t === "int") {
          const num = Number(val);
          if (!Number.isNaN(num)) val = num;
        } else if (t === "boolean" || t === "bool") {
          if (val === "true" || val === true) val = true;
          else if (val === "false" || val === false) val = false;
        }
        
        // 处理 textarea 类型的换行符
        if (f.type === "textarea" && val) {
          val = val.replace(/\n/g, "\\n");
        }
        
        // 替换模板中的占位符
        // 关键修复：正确处理字符串值的 JSON 转义
        // 由于模板中占位符通常在引号内（如 "{{字段}}"），我们需要：
        // 1. 字符串值：转义特殊字符（引号、反斜杠等），但不加外层引号（模板已有）
        // 2. 数字/布尔值：直接转换为字符串（不带引号）
        const regex = new RegExp(`\\{\\{${f.key}.*?\\}\\}`, "g");
        let replacement: string;
        
        if (typeof val === "string") {
          // 字符串值：使用 JSON.stringify 转义特殊字符，然后去掉外层引号
          // 因为模板中已经有引号了（如 "{{字段}}" -> "转义后的值"）
          replacement = JSON.stringify(val).slice(1, -1);
        } else if (typeof val === "boolean" || typeof val === "number") {
          // 布尔值或数字：直接转换为字符串（不带引号）
          // 注意：如果模板中占位符在引号内，这会导致 JSON 无效
          // 但根据当前模板结构，布尔值和数字通常不在引号内
          replacement = String(val);
        } else {
          // 其他类型（如 null）：转换为字符串
          replacement = String(val);
        }
        
        bodyStr = bodyStr.replace(regex, replacement);
      });

      addLog(task.id, "提交中...", "info");

      // 2. 解析 JSON 并清洗
      let bodyJSON: any;
      try {
        bodyJSON = JSON.parse(bodyStr);
      } catch (parseError) {
        // JSON 解析失败：记录详细错误信息
        const errorMsg = parseError instanceof Error ? parseError.message : "未知错误";
        addLog(task.id, `请求体解析失败: ${errorMsg}`, "error", bodyStr);
        throw new Error(`请求体解析失败: ${errorMsg}。请检查模板替换逻辑。`);
      }
      
      bodyJSON = cleanJSON(bodyJSON);

      addLog(task.id, "请求预览", "debug", JSON.stringify(bodyJSON, null, 2));

      // 3. 构建请求 URL 和头部
      let url = cred.baseUrl + model.createPath;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // 处理 token：如果 URL 中包含 {{token}}，则替换；否则添加到 Authorization 头
      if (url.includes("{{token}}")) {
        url = url.replace("{{token}}", cred.token);
      } else {
        headers["Authorization"] = `Bearer ${cred.token}`;
      }

      // 4. 通过代理发送创建请求
      const createResponse = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          method: "POST",
          headers,
          body: bodyJSON,
        }),
      });

      const createData = await createResponse.json();

      // 检查响应状态：如果 API 返回错误，解析并记录详细错误信息
      if (!createResponse.ok || createData.status >= 400) {
        const errorData = createData.data || {};
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `HTTP ${createData.status || createResponse.status}`;
        
        addLog(
          task.id,
          `请求失败: ${errorMessage}`,
          "error",
          JSON.stringify(errorData, null, 2)
        );
        
        throw new Error(`API 请求失败: ${errorMessage}`);
      }

      const data = createData.data;

      addLog(task.id, "响应", "debug", JSON.stringify(data, null, 2));

      // 5. 处理同步模式（没有 queryPath）
      if (!model.queryPath) {
        const out = getNested(data, model.paths.outputUrl);
        if (out) {
          // 获取任务的最新状态，检查是否需要自动下载
          const latestTask = useNexusStore.getState().tasks.find((t) => t.id === task.id);
          const shouldAutoDownload = latestTask?.autoDownload !== false; // 默认为 true
          
          updateTask(task.id, {
            result: out,
            status: "success",
            endTime: Date.now(), // 记录任务结束时间
          });
          addLog(task.id, "成功 (同步)", "success");
          
          // 如果启用了自动下载且是视频文件，则自动下载
          if (shouldAutoDownload && isVideo(out)) {
            // 延迟一下，确保任务状态已更新
            setTimeout(async () => {
              try {
                await autoDownloadFile(out);
                addLog(task.id, "已自动下载视频", "success");
              } catch (error) {
                addLog(task.id, "自动下载失败，请手动下载", "warning");
              }
            }, 500);
          }
          
          return;
        } else {
          updateTask(task.id, {
            status: "failed",
            endTime: Date.now(), // 记录任务结束时间
          });
          addLog(task.id, "无结果URL", "warning");
          return;
        }
      }

      // 6. 异步模式：获取任务 ID 并开始轮询
      const taskId = getNested(data, model.paths.taskId);
      if (!taskId) {
        throw new Error("无任务ID");
      }

      addLog(task.id, `ID: ${taskId}`, "success");

      // 7. 开始轮询（使用 setTimeout 递归调用）
      const poll = async () => {
        // 检查任务状态，如果不是 polling 则停止
        const currentTask = useNexusStore.getState().tasks.find(
          (t) => t.id === task.id
        );
        if (!currentTask || currentTask.status !== "polling") {
          return;
        }

        try {
          // 构建查询 URL
          const qUrl =
            cred.baseUrl + model.queryPath.replace("{{task_id}}", taskId);
          const qHeaders: Record<string, string> = {
            Authorization: `Bearer ${cred.token}`,
          };

          // 通过代理发送查询请求
          const queryResponse = await fetch("/api/proxy", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: qUrl,
              method: "GET",
              headers: qHeaders,
            }),
          });

          const queryData = await queryResponse.json();
          const qData = queryData.data;

          const st = getNested(qData, model.paths.status);
          const out = getNested(qData, model.paths.outputUrl);
          
          // 提取错误信息（如果存在）
          const errorMsg = qData.error || qData.message || null;

          addLog(task.id, `状态: ${st}${errorMsg ? ` | ${errorMsg}` : ""}`);

          // 检查是否完成
          if (
            out ||
            ["completed", "success", "video_generation_completed"].includes(st)
          ) {
            if (out) {
              // 获取任务的最新状态，检查是否需要自动下载
              const latestTask = useNexusStore.getState().tasks.find((t) => t.id === task.id);
              const shouldAutoDownload = latestTask?.autoDownload !== false; // 默认为 true
              
              updateTask(task.id, {
                result: out,
                status: "success",
                endTime: Date.now(), // 记录任务结束时间
              });
              addLog(task.id, "完成！", "success");
              
              // 如果启用了自动下载且是视频文件，则自动下载
              if (shouldAutoDownload && isVideo(out)) {
                // 延迟一下，确保任务状态已更新
                setTimeout(async () => {
                  try {
                    await autoDownloadFile(out);
                    addLog(task.id, "已自动下载视频", "success");
                  } catch (error) {
                    addLog(task.id, "自动下载失败，请手动下载", "warning");
                  }
                }, 500);
              }
              
              return;
            }
          }

          // 检查是否失败
          if (["failed", "error"].includes(st)) {
            updateTask(task.id, {
              status: "failed",
              endTime: Date.now(), // 记录任务结束时间
            });
            // 解析并记录详细的错误信息
            let errorDetail = "任务失败";
            if (errorMsg) {
              // 解析错误信息，提取关键部分
              if (errorMsg.includes("socket hang up")) {
                errorDetail = "网络连接中断（可能是上传超时或服务器关闭连接）";
              } else if (errorMsg.includes("timeout")) {
                errorDetail = "请求超时";
              } else if (errorMsg.includes("INVALID_ARGUMENT")) {
                errorDetail = "参数错误：请检查请求参数是否符合 API 要求";
              } else {
                errorDetail = `错误: ${errorMsg}`;
              }
            }
            addLog(task.id, errorDetail, "error", JSON.stringify(qData, null, 2));
            return;
          }

          // 继续轮询：3 秒后再次调用
          setTimeout(poll, 3000);
        } catch (e) {
          // 轮询错误：5 秒后重试
          const errorMsg =
            e instanceof Error ? e.message : "未知错误";
          addLog(task.id, `轮询错: ${errorMsg}`, "error");
          setTimeout(poll, 5000);
        }
      };

      // 开始第一次轮询
      poll();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "未知错误";
      addLog(task.id, errorMsg, "error");
      updateTask(task.id, {
        status: "failed",
        endTime: Date.now(), // 记录任务结束时间
      });
    }
  }

  return {
    submitTask,
    isSubmitting,
  };
}
