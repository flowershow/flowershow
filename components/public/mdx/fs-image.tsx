import Image from 'next/image';
import { ImgHTMLAttributes } from 'react';

function FsImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const newProps = {
    src: typeof props.src == 'string' ? props.src : '',
    alt: props.alt ?? 'Image',
    className: 'not-prose',
  };

  if (props.width && props.height) {
    const width =
      typeof props.width === 'number'
        ? props.width
        : Number.parseInt(props.width);
    const height =
      typeof props.height === 'number'
        ? props.height
        : Number.parseInt(props.height);
    // No sizes attribute here - we treat user provided image sizes as fixed, literal (not just image geometry)
    // Next.js will generate DPR-based srcset
    // (1x, 2x, etc.) for pixel density optimization while maintaining exact dimensions
    return (
      <div className="fixed-image-container">
        <Image {...newProps} width={width} height={height} />
      </div>
    );
  }

  return (
    <div className="image-container">
      {/* Optimized sizes for content width:
        - Desktop (1280px+): max prose width (72rem = 1152px)
        - Mobile: viewport*/}
      <Image
        {...newProps}
        fill
        objectFit="contain"
        sizes="(min-width: 1280px) 1152px, 100vw"
      />
    </div>
  );
}

export default FsImage;
