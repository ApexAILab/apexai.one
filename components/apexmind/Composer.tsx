"use client";

import { ArrowUp, Check, Image as ImageIcon, LoaderCircle, Tag } from "lucide-react";
import { ChangeEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";
import { TagInput } from "@/components/apexmind/TagInput";
import { ImageGrid } from "@/components/apexmind/ImageGrid";
import { requestJson } from "@/lib/api-client";
import { CHINA_TIME_ZONE, MAX_IMAGES_PER_THOUGHT } from "@/lib/constants";
import { uploadImage } from "@/lib/image-upload";
import type { ImageAssetDto, ThoughtDto } from "@/types/api";

type ComposerProps = {
  hasThoughtToday: boolean;
  onCreated: (thought: ThoughtDto) => void;
  onError: (message: string) => void;
};

function todayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: CHINA_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date());
}

export function Composer({ hasThoughtToday, onCreated, onError }: ComposerProps) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<ImageAssetDto[]>([]);
  const [tagMode, setTagMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resizeTextarea() {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 280)}px`;
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES_PER_THOUGHT) {
      onError(`每条想法最多添加 ${MAX_IMAGES_PER_THOUGHT} 张图片`);
      return;
    }

    setUploading(true);
    try {
      const uploaded: ImageAssetDto[] = [];
      for (const file of files) uploaded.push(await uploadImage(file));
      setImages((current) => [...current, ...uploaded]);
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(id: string) {
    const previous = images;
    setImages((items) => items.filter((item) => item.id !== id));
    try {
      await requestJson(`/api/images/${id}`, { method: "DELETE" });
    } catch (reason) {
      setImages(previous);
      onError(reason instanceof Error ? reason.message : "图片删除失败");
    }
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if ((!content.trim() && !images.length) || uploading || submitting) return;
    setSubmitting(true);
    try {
      const thought = await requestJson<ThoughtDto>("/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          tags,
          imageIds: images.map((image) => image.id),
        }),
      });
      setContent("");
      setTags([]);
      setImages([]);
      setTagMode(false);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      onCreated(thought);
      textareaRef.current?.focus();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <form className="composer-card glass-card" onSubmit={handleSubmit}>
      <div
        className={`composer-today ${hasThoughtToday ? "is-complete" : ""}`}
        aria-label={hasThoughtToday ? "今天已发布想法" : "今天还没有发布想法"}
      >
        <span>{todayLabel()}</span>
        <i aria-hidden="true"><Check /></i>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          resizeTextarea();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Write freely…"
        aria-label="记录想法"
        rows={3}
        maxLength={20_000}
      />
      {images.length ? <ImageGrid images={images} editable onRemove={removeImage} /> : null}
      {tagMode || tags.length ? <TagInput tags={tags} onChange={setTags} autoFocus={tagMode && !tags.length} /> : null}
      <div className="composer-footer">
        <div className="composer-tools">
          <button type="button" aria-label="添加图片" title="添加图片" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <LoaderCircle className="spin" aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}
          </button>
          <button type="button" aria-label="添加标签" title="添加标签" className={tagMode ? "is-active" : ""} onClick={() => setTagMode((value) => !value)}>
            <Tag aria-hidden="true" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            hidden
            onChange={handleFiles}
          />
        </div>
        <button
          className="publish-button"
          type="submit"
          aria-label="发布想法"
          title="发布想法"
          disabled={(!content.trim() && !images.length) || uploading || submitting}
        >
          {submitting ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
