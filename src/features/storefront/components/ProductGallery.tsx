"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { StorefrontProductImage } from "../types";

export function ProductGallery({
  images,
  productName,
}: {
  images: StorefrontProductImage[];
  productName: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square w-full rounded-2xl border border-border/70 bg-muted/30 flex items-center justify-center text-muted-foreground/40">
        <ImageIcon className="h-16 w-16" />
      </div>
    );
  }

  const activeImage = images[selectedIndex] || images[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image View */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/20 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage.url}
          alt={activeImage.alt_text || productName}
          className="h-full w-full object-cover object-center transition-all duration-300"
        />
      </div>

      {/* Thumbnails Strip */}
      {images.length > 1 && (
        <div
          role="region"
          aria-label="Product thumbnails"
          className="flex items-center gap-3 overflow-x-auto pb-1"
        >
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") {
                    setSelectedIndex((idx + 1) % images.length);
                  } else if (e.key === "ArrowLeft") {
                    setSelectedIndex((idx - 1 + images.length) % images.length);
                  }
                }}
                className={`relative aspect-square h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 scale-105"
                    : "border-border/60 opacity-70 hover:opacity-100 hover:border-border"
                }`}
                aria-label={`View image ${idx + 1} of ${images.length}`}
                aria-current={isSelected ? "true" : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt_text || `${productName} thumbnail ${idx + 1}`}
                  className="h-full w-full object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

