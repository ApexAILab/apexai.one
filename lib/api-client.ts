type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error?: { message?: string } };

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.ok) {
    const message = payload && !payload.ok ? payload.error?.message : undefined;
    throw new Error(message || "请求失败，请稍后重试");
  }
  return payload.data;
}
