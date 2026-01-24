import Image from 'next/image';
import { ImgHTMLAttributes } from 'react';

function FsImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  // TODO image optimization disabled for now, see issue https://github.com/flowershow/flowershow/issues/1013
  // const commonProps = {
  //   src: typeof props.src === "string" ? props.src : "",
  //   alt: props.alt ?? "Image",
  //   className: "not-prose",
  // };

  // if (props.width && props.height) {
  //   const width = parseSize(props.width);
  //   const height = parseSize(props.height);
  //   return (
  //     <Image
  //       {...commonProps}
  //       width={width}
  //       height={height}
  //       style={{
  //         width: `${width}px`,
  //         height: `${height}px`,
  //         margin: "auto",
  //       }}
  //     />
  //   );
  // }

  // if (props.width) {
  //   const width = parseSize(props.width);
  //   // we need some value for height, so we default to width, but this will cause layout shift if image is not square obviously
  //   const height = width;
  //   return (
  //     <Image
  //       {...commonProps}
  //       width={width}
  //       height={height}
  //       style={{ margin: "auto", width: `${width}px` }}
  //     />
  //   );
  // }

  let width: number | undefined;
  let height: number | undefined;
  const style: any = { margin: 'auto' };

  if (props.width) {
    style.width = `${parseSize(props.width)}px`;
  }
  if (props.height) {
    style.height = `${parseSize(props.height)}px`;
  }

  return (
    <img {...props} width={width} height={height} style={style} />
    // <div style={{ position: "relative", width: "100%", aspectRatio: "3/2" }}>
    //   {/* Optimized sizes for content width:
    //     - Desktop (1280px+): max prose width (72rem = 1152px)
    //     - Mobile: viewport*/}
    //   <Image
    //     {...commonProps}
    //     fill
    //     objectFit="contain"
    //     sizes="(min-width: 1280px) 1152px, 100vw"
    //   />
    // </div>
  );
}

export default FsImage;

const parseSize = (value: string | number): number =>
  typeof value === 'number' ? value : Number.parseInt(value);
