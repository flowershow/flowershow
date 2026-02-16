import Image from 'next/image';
import { ImgHTMLAttributes } from 'react';

function FsImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const {
    src: rawSrc,
    alt,
    width: rawWidth,
    height: rawHeight,
    className,
    ...rest
  } = props;

  const src = typeof rawSrc === 'string' ? rawSrc : '';

  // Author-explicit dimensions (e.g. ![[image|300x200]] or HTML width/height).
  const width = rawWidth ? parseSize(rawWidth) : undefined;
  const height = rawHeight ? parseSize(rawHeight) : undefined;

  // DB-intrinsic dimensions: the original image geometry stored in the
  // database. Used only for aspect ratio in responsive rendering, never
  // as fixed pixel sizes (images may be very large).
  const intrinsicWidth = parseSizeAttr(rest['data-intrinsic-width' as keyof typeof rest]);
  const intrinsicHeight = parseSizeAttr(rest['data-intrinsic-height' as keyof typeof rest]);

  // Strip data attributes so they don't leak onto the rendered <img>.
  const { ['data-intrinsic-width' as string]: _iw, ['data-intrinsic-height' as string]: _ih, ...cleanRest } = rest as Record<string, unknown>;

  const imageProps = {
    src,
    alt: alt ?? '',
    className: mergeClassNames('not-prose', className),
    ...cleanRest,
  };

  // Case 1: Author-explicit dimensions — render at fixed pixel size.
  if (width || height) {
    // next/image requires both width and height. If the author supplies
    // only one side, mirror it to preserve a square fallback shape. The
    // final `1` is a defensive minimum so these are always valid numbers.
    const normalizedWidth = width ?? height ?? 1;
    const normalizedHeight = height ?? width ?? 1;

    return (
      <Image
        {...imageProps}
        width={normalizedWidth}
        height={normalizedHeight}
        style={{
          width: width ? `${normalizedWidth}px` : undefined,
          height: height ? `${normalizedHeight}px` : undefined,
          margin: '0 auto',
        }}
      />
    );
  }

  // Case 2: DB-intrinsic dimensions — responsive rendering with known
  // aspect ratio. The image fills its container (`width: 100%`) while
  // next/image uses the intrinsic size for aspect ratio calculation and
  // srcset generation, preventing layout shift.
  if (intrinsicWidth && intrinsicHeight) {
    return (
      <Image
        {...imageProps}
        width={intrinsicWidth}
        height={intrinsicHeight}
        sizes="(min-width: 1280px) 1152px, 100vw"
        style={{ width: '100%', height: 'auto' }}
      />
    );
  }

  // Case 3: No dimensions at all — responsive fallback. Passing 0/0
  // satisfies next/image's required props while signaling that layout
  // should be driven entirely by CSS + `sizes`.
  return (
    <Image
      {...imageProps}
      width={0}
      height={0}
      sizes="(min-width: 1280px) 1152px, 100vw"
      style={{ width: '100%', height: 'auto' }}
    />
  );
}

export default FsImage;

const parseSize = (value: string | number): number =>
  typeof value === 'number' ? value : Number.parseInt(value);

/** Parse a data attribute value that may be string, number, or absent. */
const parseSizeAttr = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number.parseInt(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
};

const mergeClassNames = (...classNames: Array<string | undefined>): string =>
  classNames.filter(Boolean).join(' ');
