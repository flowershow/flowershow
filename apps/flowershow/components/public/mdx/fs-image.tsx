import Image from 'next/image';
import React, { ImgHTMLAttributes } from 'react';

type FsImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Optional: choose how to fit when author provides WxH (e.g. 300x200). */
  fit?: 'contain' | 'cover';
  /** Optional: fallback aspect ratio when no intrinsic size is known. */
  fallbackAspectRatio?: `${number} / ${number}`;
};

export default function FsImage(props: FsImageProps) {
  const {
    src: rawSrc,
    alt,
    width: _htmlWidth,
    height: _htmlHeight,
    className,
    fit = 'contain',
    fallbackAspectRatio = '16 / 9',
    style,
    ...rest
  } = props;

  const src = typeof rawSrc === 'string' ? rawSrc : '';
  if (!src) return null;

  // Only use next/image optimization for images from wiki-link/common-mark syntax
  // (remark-wiki-link adds "internal" class). HTML/JSX images get a plain <img>.
  const isInternal = className?.split(/\s+/).includes('internal');
  if (!isInternal) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        className={className}
        style={style}
        {...rest}
      />
    );
  }

  // Author max-constraint dimensions from wiki-link syntax:
  // ![[image|300]] => data-fs-width="300"
  // ![[image|300x200]] => data-fs-width="300" data-fs-height="200"
  const maxWidth = parseSizeAttr(rest['data-fs-width' as keyof typeof rest]);
  const maxHeight = parseSizeAttr(rest['data-fs-height' as keyof typeof rest]);

  // DB-intrinsic dimensions (original geometry) stored in your DB.
  const intrinsicWidth = parseSizeAttr(
    rest['data-fs-intrinsic-width' as keyof typeof rest],
  );
  const intrinsicHeight = parseSizeAttr(
    rest['data-fs-intrinsic-height' as keyof typeof rest],
  );

  // Prevent passing data attributes (and any other <img>-only props) to next/image.
  // next/image forwards "unknown" props to the underlying <img>, which is fine,
  // but many people prefer to keep DOM clean.
  // const cleanedRest = omitDataFs(rest);
  const cleanedRest = rest;

  const commonImageProps = {
    src,
    alt: alt ?? '',
    className: mergeClassNames('not-prose', className),
    ...cleanedRest,
  } as const;

  // --- Case A: Author provided WxH (box constraint) ---
  if (maxWidth && maxHeight) {
    // Responsive box: full width up to maxWidth; height follows aspect ratio of the box.
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: `${maxWidth}px`,
          aspectRatio: `${maxWidth} / ${maxHeight}`,
          margin: '0 auto',
        }}
      >
        <Image
          {...commonImageProps}
          fill
          sizes={`(min-width: ${maxWidth}px) ${maxWidth}px, 100vw`}
          style={{ objectFit: fit }}
        />
      </div>
    );
  }

  // --- Case B: Author provided W only (max width), keep responsive + correct ratio ---
  if (maxWidth) {
    // Compute the reserved height from intrinsic ratio if available; otherwise fall back.
    const computedHeight =
      intrinsicWidth && intrinsicHeight
        ? Math.max(1, Math.round((maxWidth * intrinsicHeight) / intrinsicWidth))
        : undefined;

    // If we can't compute, use a wrapper with fallback aspect ratio to prevent CLS.
    if (!computedHeight) {
      return (
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: `${maxWidth}px`,
            aspectRatio: fallbackAspectRatio,
            margin: '0 auto',
          }}
        >
          <Image
            {...commonImageProps}
            fill
            sizes={`(min-width: ${maxWidth}px) ${maxWidth}px, 100vw`}
            style={{ objectFit: 'contain' }}
          />
        </div>
      );
    }

    // With computed ratio, use width/height (best for next/image optimization)
    return (
      <Image
        {...commonImageProps}
        width={maxWidth}
        height={computedHeight}
        sizes={`(min-width: ${maxWidth}px) ${maxWidth}px, 100vw`}
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: `${maxWidth}px`,
          margin: '0 auto',
        }}
      />
    );
  }

  // --- Case C: No author constraint; use DB intrinsic size for ratio + full-width responsive ---
  if (intrinsicWidth && intrinsicHeight) {
    return (
      <Image
        {...commonImageProps}
        width={intrinsicWidth}
        height={intrinsicHeight}
        sizes="100vw"
        style={{
          width: '100%',
          height: 'auto',
          margin: '0 auto',
        }}
      />
    );
  }

  // --- Case D: Last-resort fallback (unknown intrinsic size) ---
  // Use wrapper+fill with fallback aspect ratio to avoid CLS.
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: fallbackAspectRatio,
      }}
    >
      <Image
        {...commonImageProps}
        fill
        sizes="100vw"
        style={{ objectFit: 'contain', margin: '0 auto' }}
      />
    </div>
  );
}

/** Parse a data attribute value that may be string, number, or absent. */
const parseSizeAttr = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
};

/** Drop Flowershow-specific data attrs so they don’t end up on the DOM <img>. */
const omitDataFs = <T extends Record<string, unknown>>(obj: T): T => {
  const {
    ['data-fs-width']: _a,
    ['data-fs-height']: _b,
    ['data-fs-intrinsic-width']: _c,
    ['data-fs-intrinsic-height']: _d,
    ...rest
  } = obj as any;
  return rest as T;
};

const mergeClassNames = (...classNames: Array<string | undefined>): string =>
  classNames.filter(Boolean).join(' ');
