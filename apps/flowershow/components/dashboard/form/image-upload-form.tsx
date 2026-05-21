'use client';

import { ImageIcon, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useRef, useState } from 'react';
import { toast } from 'sonner';
import { isEmoji } from '@/lib/is-emoji';
import { api } from '@/trpc/react';

type Field = 'image' | 'favicon' | 'logo';

const DIMENSIONS: Record<Field, [number, number]> = {
  image: [1200, 630],
  favicon: [128, 128],
  logo: [400, 100],
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
  parentKey,
  currentValue,
  disabled = false,
}: {
  title: string;
  description: string;
  helpText?: ReactNode;
  field: Field;
  configKey: string;
  parentKey?: string;
  currentValue: string | null;
  disabled?: boolean;
}) {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const getUploadUrl = api.site.getAssetUploadUrl.useMutation();
  const updateConfig = api.site.updateDbConfig.useMutation();

  const displayValue = preview ?? currentValue;
  const isEmojiValue = !preview && !!currentValue && isEmoji(currentValue);
  const isSocial = field === 'image';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploading(true);

    try {
      const isSvg = file.type === 'image/svg+xml';
      const blob = isSvg ? file : await processImage(file, field);
      const contentType = isSvg ? 'image/svg+xml' : 'image/webp';
      const previewUrl = URL.createObjectURL(blob);
      setPreview(previewUrl);

      const { uploadUrl, publicUrl } = await getUploadUrl.mutateAsync({
        siteId: id,
        field,
        contentType,
      });

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': contentType },
      });
      if (!res.ok) throw new Error('Upload failed');

      const patch = parentKey
        ? { [parentKey]: { [configKey]: publicUrl } }
        : { [configKey]: publicUrl };
      await updateConfig.mutateAsync({ siteId: id, config: patch });

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
      const patch = parentKey
        ? { [parentKey]: { [configKey]: null } }
        : { [configKey]: null };
      await updateConfig.mutateAsync({ siteId: id, config: patch });
      router.refresh();
      toast.success(`${title} removed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`isolate rounded-lg border border-stone-200 ${disabled ? 'bg-stone-50' : 'bg-white'}`}
    >
      <div className="flex flex-col space-y-4 p-5 sm:p-10">
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="font-dashboard-heading text-xl">{title}</h2>
          {disabled && (
            <div className="flex shrink-0 flex-col justify-center rounded-full border px-3 py-0.5 text-xs font-medium text-stone-600">
              <span className="whitespace-nowrap">
                Available on premium plan
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-stone-500">{description}</p>

        <input
          ref={fileInputRef}
          type="file"
          accept={`image/jpeg,image/png,image/webp${field === 'favicon' ? ',image/svg+xml' : ''}`}
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => !disabled && fileInputRef.current?.click()}
            disabled={isUploading || disabled}
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

          {currentValue && !isUploading && !disabled && (
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
