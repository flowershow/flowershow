'use client';

import Image from 'next/image';
import { ImageIcon, Loader2, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { isEmoji } from '@/lib/is-emoji';
import { api } from '@/trpc/react';

type Field = 'image' | 'favicon';

const DIMENSIONS: Record<Field, [number, number]> = {
  image: [1200, 630],
  favicon: [128, 128],
};

function processImage(file: File, field: Field): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const [w, h] = DIMENSIONS[field];
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(img.src);
        reject(new Error('Canvas not available'));
        return;
      }
      const scale = Math.max(w / img.width, h / img.height);
      const sw = w / scale;
      const sh = h / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (blob) resolve(blob);
          else reject(new Error('Failed to process image'));
        },
        'image/webp',
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function ImageUploadForm({
  title,
  description,
  helpText,
  field,
  configKey,
  currentValue,
}: {
  title: string;
  description: string;
  helpText?: string;
  field: Field;
  configKey: string;
  currentValue: string | null;
}) {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const getUploadUrl = api.site.getAssetUploadUrl.useMutation();
  const updateConfig = api.site.updateConfigJson.useMutation();

  const displayValue = preview ?? currentValue;
  const isEmojiValue = !preview && !!currentValue && isEmoji(currentValue);
  const isSocial = field === 'image';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploading(true);

    try {
      const blob = await processImage(file, field);
      const previewUrl = URL.createObjectURL(blob);
      setPreview(previewUrl);

      const { uploadUrl, publicUrl } = await getUploadUrl.mutateAsync({
        siteId: id,
        field,
        contentType: 'image/webp',
      });

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/webp' },
      });
      if (!res.ok) throw new Error('Upload failed');

      await updateConfig.mutateAsync({
        siteId: id,
        config: { [configKey]: publicUrl },
      });

      URL.revokeObjectURL(previewUrl);
      setPreview(null);
      router.refresh();
      toast.success(`${title} updated.`);
    } catch (err) {
      setPreview(null);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      await updateConfig.mutateAsync({
        siteId: id,
        config: { [configKey]: null },
      });
      router.refresh();
      toast.success(`${title} removed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="isolate rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col space-y-4 p-5 sm:p-10">
        <h2 className="font-dashboard-heading text-xl">{title}</h2>
        <p className="text-sm text-stone-500">{description}</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`group relative overflow-hidden rounded-md border border-stone-300 bg-stone-50 transition-colors hover:bg-stone-100 ${
              isSocial
                ? 'aspect-[1200/630] w-full max-w-lg'
                : 'aspect-square w-20'
            }`}
          >
            {isEmojiValue ? (
              <span className="absolute inset-0 flex items-center justify-center text-3xl">
                {currentValue}
              </span>
            ) : displayValue ? (
              <Image
                src={displayValue}
                fill
                alt={title}
                className="object-cover"
              />
            ) : null}

            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity ${
                displayValue
                  ? 'bg-black/40 opacity-0 group-hover:opacity-100'
                  : 'opacity-100'
              }`}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <>
                  <ImageIcon
                    className={`h-5 w-5 ${displayValue ? 'text-white' : 'text-stone-400'}`}
                  />
                  {!displayValue && (
                    <span className="text-xs text-stone-500">Upload</span>
                  )}
                </>
              )}
            </div>
          </button>

          {currentValue && !isUploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex w-fit items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 text-sm text-stone-500 sm:px-10">
        {helpText ??
          (isSocial
            ? 'Recommended: 1200×630px. PNG, JPG, or WebP.'
            : 'PNG, JPG, or WebP. Will be resized to 128×128.')}
      </div>
    </div>
  );
}
