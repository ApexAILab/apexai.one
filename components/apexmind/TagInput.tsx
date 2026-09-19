"use client";

import { X } from "lucide-react";
import { KeyboardEvent, useState } from "react";
import { MAX_TAGS_PER_THOUGHT } from "@/lib/constants";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  autoFocus?: boolean;
};

export function TagInput({ tags, onChange, autoFocus }: TagInputProps) {
  const [value, setValue] = useState("");

  function commitTag() {
    const next = value.replace(/^#+/, "").trim();
    if (!next || tags.length >= MAX_TAGS_PER_THOUGHT) {
      setValue("");
      return;
    }
    if (!tags.some((tag) => tag.toLocaleLowerCase("zh-CN") === next.toLocaleLowerCase("zh-CN"))) {
      onChange([...tags, next]);
    }
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === "，") {
      event.preventDefault();
      commitTag();
    }
    if (event.key === "Backspace" && !value && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="tag-input-wrap">
      {tags.map((tag) => (
        <span className="tag-token" key={tag}>
          #{tag}
          <button
            type="button"
            aria-label={`移除标签 ${tag}`}
            onClick={() => onChange(tags.filter((item) => item !== tag))}
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
      {tags.length < MAX_TAGS_PER_THOUGHT ? (
        <input
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, 32))}
          onKeyDown={handleKeyDown}
          onBlur={commitTag}
          autoFocus={autoFocus}
          placeholder={tags.length ? "继续添加" : "输入标签后按回车"}
          aria-label="添加标签"
        />
      ) : null}
    </div>
  );
}
