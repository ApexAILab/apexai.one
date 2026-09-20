"use client";

import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { ImageGrid } from "@/components/apexmind/ImageGrid";
import { EditThoughtModal } from "@/components/apexmind/EditThoughtModal";
import { formatThoughtTime } from "@/lib/time";
import type { ThoughtDto } from "@/types/api";

type ThoughtCardProps = {
  thought: ThoughtDto;
  userId: string;
  onUpdated: (thought: ThoughtDto) => void;
  onDeleted: (id: string) => void;
  onTagClick: (tag: string) => void;
  onError: (message: string) => void;
};

export function ThoughtCard({ thought, userId, onUpdated, onDeleted, onTagClick, onError }: ThoughtCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <article className="thought-card">
      <header className="thought-meta">
        <time dateTime={thought.occurredAt}>{formatThoughtTime(thought.occurredAt)}</time>
        <button type="button" aria-label="编辑想法" title="编辑想法" onClick={() => setEditing(true)}>
          <Ellipsis aria-hidden="true" />
        </button>
      </header>
      {thought.content ? <p className="thought-content">{thought.content}</p> : null}
      <ImageGrid images={thought.images} />
      {thought.tags.length ? (
        <footer className="thought-tags">
          {thought.tags.map((tag) => (
            <button type="button" key={tag} onClick={() => onTagClick(tag)}>#{tag}</button>
          ))}
        </footer>
      ) : null}
      <EditThoughtModal
        key={`${thought.id}-${thought.updatedAt}`}
        thought={thought}
        userId={userId}
        open={editing}
        onClose={() => setEditing(false)}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
        onError={onError}
      />
    </article>
  );
}
