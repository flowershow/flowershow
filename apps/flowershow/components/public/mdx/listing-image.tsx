import Image from 'next/image';

export type ListingImageProps = {
  src?: string;
  alt?: string;
  sizes?: string;
  variant?: string;
};

/** Listing thumbnails and author avatars (lib/listing/render.ts). Never zoomable. */
export default function ListingImage({
  src,
  alt = '',
  sizes,
  variant = 'media',
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
      loading="lazy"
      style={{ objectFit: 'cover' }}
    />
  );
}
