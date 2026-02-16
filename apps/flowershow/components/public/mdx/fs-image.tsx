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

  const width = rawWidth ? parseSize(rawWidth) : undefined;
  const height = rawHeight ? parseSize(rawHeight) : undefined;

  const imageProps = {
    src,
    alt: alt ?? '',
    className: mergeClassNames('not-prose', className),
    ...rest,
  };

  if (width || height) {
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

const mergeClassNames = (...classNames: Array<string | undefined>): string =>
  classNames.filter(Boolean).join(' ');
