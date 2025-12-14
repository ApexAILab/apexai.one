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
    inputs: Record<string, any>
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
        // 处理 textarea 类型的换行符
        if (f.type === "textarea" && val) {
          val = val.replace(/\n/g, "\\n");
        }
        // 替换模板中的占位符
        const regex = new RegExp(`\\{\\{${f.key}.*?\\}\\}`, "g");
        bodyStr = bodyStr.replace(regex, val);
      });

      addLog(task.id, "提交中...", "info");

      // 2. 解析 JSON 并清洗
      let bodyJSON = JSON.parse(bodyStr);
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

      if (!createResponse.ok) {
        throw new Error(`HTTP ${createResponse.status}`);
      }

      const createData = await createResponse.json();
      const data = createData.data;

      addLog(task.id, "响应", "debug", JSON.stringify(data, null, 2));

      // 5. 处理同步模式（没有 queryPath）
      if (!model.queryPath) {
        const out = getNested(data, model.paths.outputUrl);
        if (out) {
          updateTask(task.id, {
            result: out,
            status: "success",
          });
          addLog(task.id, "成功 (同步)", "success");
          return;
        } else {
          updateTask(task.id, {
            status: "failed",
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

          addLog(task.id, `状态: ${st}`);

          // 检查是否完成
          if (
            out ||
            ["completed", "success", "video_generation_completed"].includes(st)
          ) {
            if (out) {
              updateTask(task.id, {
                result: out,
                status: "success",
              });
              addLog(task.id, "完成！", "success");
              return;
            }
          }

          // 检查是否失败
          if (["failed", "error"].includes(st)) {
            updateTask(task.id, {
              status: "failed",
            });
            addLog(task.id, "失败", "error", JSON.stringify(qData, null, 2));
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
      });
    }
  }

  return {
    submitTask,
    isSubmitting,
  };
}
