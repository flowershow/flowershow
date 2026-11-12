export type ImageField = 'image' | 'favicon' | 'logo';

/**
 * How dashboard image uploads are resized before they are stored.
 *
 * - `cover`: fill exactly `width`×`height`, cropping the overflow (social
 *   images and favicons have a fixed shape).
 * - `contain`: fit inside `width`×`height` keeping the aspect ratio, never
 *   cropping or upscaling (a logo can be square or a wide wordmark).
 */
const TARGETS: Record<
  ImageField,
  { width: number; height: number; fit: 'cover' | 'contain' }
> = {
  image: { width: 1200, height: 630, fit: 'cover' },
  favicon: { width: 128, height: 128, fit: 'cover' },
  logo: { width: 512, height: 512, fit: 'contain' },
};

export interface ResizePlan {
  /** Source rectangle to read from the original image. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Output (canvas) size. */
  width: number;
  height: number;
}

export function planImageResize(
  field: ImageField,
  imgWidth: number,
  imgHeight: number,
): ResizePlan {
  const { width, height, fit } = TARGETS[field];
  if (fit === 'contain') {
    const scale = Math.min(width / imgWidth, height / imgHeight, 1);
    return {
      sx: 0,
      sy: 0,
      sw: imgWidth,
      sh: imgHeight,
      width: Math.max(1, Math.round(imgWidth * scale)),
      height: Math.max(1, Math.round(imgHeight * scale)),
    };
  }
  const scale = Math.max(width / imgWidth, height / imgHeight);
  const sw = width / scale;
  const sh = height / scale;
  return {
    sx: (imgWidth - sw) / 2,
    sy: (imgHeight - sh) / 2,
    sw,
    sh,
    width,
    height,
  };
}
