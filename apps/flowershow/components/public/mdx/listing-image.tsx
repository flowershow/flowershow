import Image from 'next/image';

export type ListingImageProps = {
  src?: string;
  alt?: string;
  sizes?: string;
  variant?: string;
  /** "eager" for a featured hero, which is usually above the fold. */
  loading?: string;
  /** "high" for the page's first featured hero only. */
  fetchPriority?: string;
};

/** Listing thumbnails and author avatars (lib/listing/render.ts). Never zoomable; lazy except a featured hero. */
export default function ListingImage({
  src,
  alt = '',
  sizes,
  variant = 'media',
  loading,
  fetchPriority,
}: ListingImageProps) {
  if (!src) return null;
  if (variant === 'avatar') {
    return (
      <Image
        className="list-component-item-author-avatar"
        src={src}
        alt={alt}
        width={20}
        height={20}
        sizes="20px"
        loading="lazy"
      />
    );
  }
  return (
    <Image
      className="list-component-item-media-img"
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? '100vw'}
      loading={loading === 'eager' ? 'eager' : 'lazy'}
      {...(fetchPriority === 'high' ? { fetchPriority: 'high' as const } : {})}
      style={{ objectFit: 'cover' }}
    />
  );
}
