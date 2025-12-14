/**
 * Nexus 工具函数
 * 从 NEXUS.html 逐行翻译，保留原始逻辑
 */

/**
 * 解析模板字符串，提取字段定义
 * 支持格式：{{field:type:opt1,opt2|default}}
 * 
 * @param tpl - 模板字符串，包含 {{field:type|default}} 格式的占位符
 * @returns 解析后的字段数组
 */
export function parseTemplate(tpl: string | null | undefined): Array<{
  key: string;
  label: string;
  type: string;
  options: string[];
  defaultValue: string;
}> {
  if (!tpl) return [];
  
  const fields: Array<{
    key: string;
    label: string;
    type: string;
    options: string[];
    defaultValue: string;
  }> = [];
  
  // 保留原始正则表达式
  const regex = /\{\{(.*?)\}\}/g;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(tpl)) !== null) {
    // 分割默认值：{{field:type|default}}
    const [def, defaultVal] = match[1].split("|");
    
    // 分割字段定义：field:type:opt1,opt2
    const parts = def.split(":");
    
    fields.push({
      key: parts[0],
      label: parts[0],
      type: parts[1] || "text",
      options: parts.slice(2).join(":").split(",").filter(Boolean),
      defaultValue: defaultVal || "",
    });
  }
  
  return fields;
}

/**
 * JSON 清洗器
 * 递归移除空字符串、null、undefined 和字符串 "undefined"
 * 
 * @param obj - 要清洗的对象
 * @returns 清洗后的对象
 */
export function cleanJSON(obj: any): any {
  // 如果是数组，过滤并递归处理每个元素
  if (Array.isArray(obj)) {
    return obj
      .filter(
        (v) =>
          v !== "" &&
          v !== null &&
          v !== undefined &&
          v !== "undefined"
      )
      .map(cleanJSON);
  }
  
  // 如果是对象，递归处理每个属性
  if (typeof obj === "object" && obj !== null) {
    Object.keys(obj).forEach((k) => {
      obj[k] = cleanJSON(obj[k]);
    });
  }
  
  return obj;
}
