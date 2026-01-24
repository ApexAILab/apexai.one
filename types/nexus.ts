/**
 * Nexus 功能相关的类型定义
 * 基于 NEXUS.html 中的数据结构
 */

/**
 * 凭证接口
 * 用于存储 API 访问凭证
 */
export interface Credential {
  /** 唯一标识符 */
  id: string;
  /** 凭证名称 */
  name: string;
  /** API 基础 URL */
  baseUrl: string;
  /** 访问令牌 */
  token: string;
}

/**
 * 模型路径配置
 * 用于从 API 响应中提取任务信息
 */
export interface ModelPaths {
  /** 任务 ID 的路径（支持点号分隔的嵌套路径，如 "data.task_id"） */
  taskId: string;
  /** 任务状态的路径 */
  status: string;
  /** 输出 URL 的路径 */
  outputUrl: string;
}

/**
 * 模型接口
 * 定义 AI 模型的配置信息
 */
export interface Model {
  /** 唯一标识符 */
  id: string;
  /** 关联的凭证 ID */
  credentialId: string;
  /** 模型名称 */
  name: string;
  /** 创建任务的 POST 路径 */
  createPath: string;
  /** 查询任务状态的路径（可选，为空表示同步模式） */
  queryPath: string;
  /** 响应数据路径配置 */
  paths: ModelPaths;
  /** JSON 请求体模板，支持 {{field:type|default}} 格式 */
  bodyTemplate: string;
}

/**
 * 任务状态类型
 */
export type TaskStatus = "polling" | "success" | "failed" | "stopped";

/**
 * 任务日志类型
 */
export type TaskLogType = "error" | "success" | "info" | "debug" | "warning";

/**
 * 任务日志接口
 * 记录任务执行过程中的日志信息
 */
export interface TaskLog {
  /** 日志时间（格式化的时间字符串） */
  time: string;
  /** 日志消息 */
  msg: string;
  /** 日志类型 */
  type: TaskLogType;
  /** 调试详情（可选，仅在调试模式下显示） */
  detail?: string | null;
}

/**
 * 任务接口
 * 表示一个 AI 任务实例
 */
export interface Task {
  /** 唯一标识符 */
  id: string;
  /** 关联的模型 ID */
  modelId: string;
  /** 模型名称（冗余字段，用于快速显示） */
  modelName: string;
  /** 任务开始时间（时间戳） */
  startTime: number;
  /** 任务结束时间（时间戳，任务完成/失败/停止时设置） */
  endTime?: number;
  /** 任务状态 */
  status: TaskStatus;
  /** 任务输入参数（表单数据） */
  inputs: Record<string, any>;
  /** 任务日志列表 */
  logs: TaskLog[];
  /** 任务结果 URL（成功时） */
  result: string | null;
  /** 任务摘要（用于列表显示） */
  summary: string;
  /** 是否自动下载（任务完成后自动下载视频） */
  autoDownload?: boolean;
}
