"use client";

import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";
import type { ImageAssetDto } from "@/types/api";
import { IconButton } from "@/components/ui/IconButton";

type ImageGridProps = {
  images: ImageAssetDto[];
  editable?: boolean;
  onRemove?: (id: string) => void;
};

export function ImageGrid({ images, editable, onRemove }: ImageGridProps) {
  const [active, setActive] = useState<ImageAssetDto | null>(null);
  if (!images.length) return null;

  return (
    <>
      <div className={`image-grid image-grid-${Math.min(images.length, 5)}`}>
        {images.map((image, index) => (
          <div className="image-tile" key={image.id}>
            <button type="button" className="image-open" onClick={() => setActive(image)}>
              <Image
                src={image.url}
                alt={`想法图片 ${index + 1}`}
                width={image.width}
                height={image.height}
                sizes={images.length === 1 ? "(max-width: 720px) 100vw, 680px" : "(max-width: 720px) 50vw, 340px"}
              />
            </button>
            {editable && onRemove ? (
              <IconButton label="移除图片" className="image-remove" onClick={() => onRemove(image.id)}>
                <X aria-hidden="true" />
              </IconButton>
            ) : null}
          </div>
        ))}
      </div>
      {active ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="查看图片" onClick={() => setActive(null)}>
          <IconButton label="关闭图片" className="lightbox-close" onClick={() => setActive(null)}>
            <X aria-hidden="true" />
          </IconButton>
          <Image
            src={active.url}
            alt="想法图片大图"
            width={active.width}
            height={active.height}
            sizes="100vw"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
