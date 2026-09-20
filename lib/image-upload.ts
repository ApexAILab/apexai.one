"use client";

import { requestJson } from "@/lib/api-client";
import type { ImageAssetDto } from "@/types/api";

export function uploadImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  return requestJson<ImageAssetDto>("/api/images", { method: "POST", body: form });
}
