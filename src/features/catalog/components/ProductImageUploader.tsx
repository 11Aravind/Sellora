"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, X, ArrowLeft, ArrowRight, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ManagedImageItem {
  id?: string;
  url: string;
  alt: string;
  position: number;
  file?: File; // Present if waiting to be uploaded
  isUploading?: boolean;
}

interface ProductImageUploaderProps {
  images: ManagedImageItem[];
  onChange: (images: ManagedImageItem[]) => void;
  maxImages?: number;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function ProductImageUploader({
  images,
  onChange,
  maxImages = 8,
}: ProductImageUploaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > maxImages) {
      toast.error(`You can only upload a maximum of ${maxImages} images per product.`);
      return;
    }

    const newItems: ManagedImageItem[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" is not supported. Please upload JPEG, PNG, or WEBP only.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds the 5 MB limit. Please select a smaller image.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        url: previewUrl,
        alt: file.name.replace(/\.[^/.]+$/, ""),
        position: images.length + newItems.length,
        file,
      });
    }

    if (newItems.length > 0) {
      onChange([...images, ...newItems]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const updated = images
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, position: idx }));
    onChange(updated);
  };

  const handleMove = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((item, idx) => ({ ...item, position: idx }));
    onChange(reordered);
  };

  const handleAltChange = (index: number, alt: string) => {
    const updated = images.map((item, i) => (i === index ? { ...item, alt } : item));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold">Product Images ({images.length} of {maxImages})</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Supported formats: JPEG, PNG, WEBP. Max 5 MB each. First image is the primary cover.
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        {images.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold gap-1.5 h-8"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Images</span>
          </Button>
        )}
      </div>

      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border/80 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-all flex flex-col items-center justify-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div className="text-xs font-semibold text-foreground">Click to upload product images</div>
          <p className="text-[11px] text-muted-foreground">Drag and drop or browse files up to 5 MB</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((item, index) => (
            <div
              key={item.id || item.url + index}
              className="group relative rounded-xl border border-border/80 bg-card p-2 space-y-2 shadow-sm"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted/40 border border-border/50">
                <Image
                  src={item.url}
                  alt={item.alt || "Product image"}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover"
                />

                {index === 0 && (
                  <div className="absolute top-1.5 left-1.5 bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">
                    Primary Cover
                  </div>
                )}

                {item.isUploading && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-foreground flex items-center justify-center transition-colors shadow-sm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Alt text input */}
              <div className="space-y-1">
                <Input
                  placeholder="Alt description..."
                  value={item.alt}
                  onChange={(e) => handleAltChange(index, e.target.value)}
                  className="text-[11px] h-7 px-2"
                />
              </div>

              {/* Reordering controls */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span>Pos: {index + 1}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={index === 0}
                    onClick={() => handleMove(index, "left")}
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={index === images.length - 1}
                    onClick={() => handleMove(index, "right")}
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
