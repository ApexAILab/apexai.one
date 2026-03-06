/**
 * ApexMind Embedding & RAG 工具
 * - 负责调用上游 Embedding 接口
 * - 提供向量序列化 / 反序列化与相似度计算
 */

/**
 * 调用 OpenAI 兼容的 Embedding 接口
 * 要求 baseUrl 指向兼容 /v1/embeddings 的服务
 */
export async function embedText(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  input: string;
}): Promise<Float32Array | null> {
  const { baseUrl, apiKey, model, input } = params;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const endpoint = `${baseUrl.replace(/\/$/, "")}/v1/embeddings`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: trimmed,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "[ApexMind] Embedding upstream error:",
        res.status,
        text,
      );
      return null;
    }

    const json: any = await res.json();
    const raw: unknown =
      json?.data && Array.isArray(json.data) && json.data[0]?.embedding
        ? json.data[0].embedding
        : null;

    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn("[ApexMind] Embedding response missing embedding array");
      return null;
    }

    const floats = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      const v = Number(raw[i]);
      floats[i] = Number.isFinite(v) ? v : 0;
    }

    return floats;
  } catch (error) {
    console.error("[ApexMind] Embedding request failed:", error);
    return null;
  }
}

/**
 * 将 Float32Array 序列化为 Buffer，存入 Prisma Bytes 字段
 */
export function serializeEmbedding(vec: Float32Array): Buffer {
  // 直接复用底层 ArrayBuffer，避免拷贝
  return Buffer.from(vec.buffer.slice(vec.byteOffset, vec.byteOffset + vec.byteLength));
}

/**
 * 从 Prisma Bytes 字段反序列化出 Float32Array
 */
export function deserializeEmbedding(data: Buffer | Uint8Array | null): Float32Array | null {
  if (!data) return null;

  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buf.byteLength === 0) return null;

  // Buffer 可能是更大的 ArrayBuffer 的视图，这里只截取自身范围
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  if (arrayBuffer.byteLength % 4 !== 0) {
    console.warn("[ApexMind] Invalid embedding buffer length:", arrayBuffer.byteLength);
    return null;
  }

  return new Float32Array(arrayBuffer);
}

/**
 * 计算两个向量的余弦相似度
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < len; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }

  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

