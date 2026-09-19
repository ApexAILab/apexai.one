"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { TagInput } from "@/components/apexmind/TagInput";
import { ImageGrid } from "@/components/apexmind/ImageGrid";
import { requestJson } from "@/lib/api-client";
import { chinaLocalInputToIso, toDatetimeLocalValue } from "@/lib/time";
import { MAX_IMAGES_PER_THOUGHT } from "@/lib/constants";
import type { ImageAssetDto, ThoughtDto } from "@/types/api";

type EditThoughtModalProps = {
  thought: ThoughtDto;
  open: boolean;
  onClose: () => void;
  onUpdated: (thought: ThoughtDto) => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
};

export function EditThoughtModal({ thought, open, onClose, onUpdated, onDeleted, onError }: EditThoughtModalProps) {
  const [content, setContent] = useState(thought.content);
  const [tags, setTags] = useState(thought.tags);
  const [images, setImages] = useState(thought.images);
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocalValue(thought.occurredAt));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length + images.length > MAX_IMAGES_PER_THOUGHT) {
      onError(`每条想法最多添加 ${MAX_IMAGES_PER_THOUGHT} 张图片`);
      return;
    }
    setUploading(true);
    try {
      const next: ImageAssetDto[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        next.push(await requestJson<ImageAssetDto>("/api/images", { method: "POST", body: form }));
      }
      setImages((current) => [...current, ...next]);
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await requestJson<ThoughtDto>(`/api/thoughts/${thought.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          tags,
          imageIds: images.map((image) => image.id),
          occurredAt: chinaLocalInputToIso(occurredAt),
        }),
      });
      onUpdated(updated);
      onClose();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function deleteThought() {
    setSaving(true);
    try {
      await requestJson(`/api/thoughts/${thought.id}`, { method: "DELETE" });
      onDeleted(thought.id);
      onClose();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="编辑想法" onClose={onClose} className="edit-modal">
      <form className="edit-form" onSubmit={save}>
        <label>
          <span>内容</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={7} maxLength={20_000} />
        </label>
        <label>
          <span>时间</span>
          <input type="datetime-local" step="1" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} required />
        </label>
        <div className="edit-field">
          <span>标签</span>
          <TagInput tags={tags} onChange={setTags} />
        </div>
        <div className="edit-field">
          <div className="edit-field-heading">
            <span>图片</span>
            <button type="button" className="text-button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <LoaderCircle className="spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
              添加图片
            </button>
          </div>
          <ImageGrid images={images} editable onRemove={(id) => setImages((items) => items.filter((item) => item.id !== id))} />
          <input ref={fileInputRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleFiles} />
        </div>
        {confirmDelete ? (
          <div className="delete-confirm">
            <p>删除后无法恢复，确定永久删除这条想法吗？</p>
            <div>
              <button type="button" className="secondary-button" onClick={() => setConfirmDelete(false)}>取消</button>
              <button type="button" className="danger-button" onClick={deleteThought} disabled={saving}>永久删除</button>
            </div>
          </div>
        ) : (
          <div className="edit-actions">
            <button type="button" className="delete-trigger" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden="true" /> 删除
            </button>
            <div>
              <button type="button" className="secondary-button" onClick={onClose}>取消</button>
              <button type="submit" className="primary-button" disabled={saving || uploading || (!content.trim() && !images.length)}>
                {saving ? "保存中…" : "保存修改"}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
