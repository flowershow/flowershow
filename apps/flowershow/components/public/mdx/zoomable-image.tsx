'use client';

import Image, { type ImageProps } from 'next/image';
import {
  type ImgHTMLAttributes,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * Images inside these keep their own interaction: links stay links, canvases
 * keep pan/zoom, and custom footer (`_footer.html`) logos/badges stay plain
 * images rather than adding a lightbox tab stop to every page.
 */
const NON_ZOOMABLE_ANCESTORS = 'a, .canvas-container, .site-footer-custom';

/** Kept short and soft: the zoom should feel like the image lifting, not flying. */
const ANIMATION: KeyframeAnimationOptions = {
  duration: 250,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  // 'both' so a reversed (closed mid-open) animation holds its start frame.
  fill: 'both',
};

type ZoomableImageProps =
  | ({ optimized: true } & ImageProps)
  | ({ optimized?: false } & ImgHTMLAttributes<HTMLImageElement>);

/**
 * An image that opens full size in a lightbox when clicked. Renders the same
 * element FsImage would (next/image or a plain <img>), so layout and author
 * styles are unchanged.
 */
export default function ZoomableImage(props: ZoomableImageProps) {
  const { optimized, ...imageProps } = props;
  const ref = useRef<HTMLImageElement>(null);
  const [zoomable, setZoomable] = useState(false);
  const [open, setOpen] = useState(false);

  const src = typeof imageProps.src === 'string' ? imageProps.src : '';
  const alt = imageProps.alt ?? '';

  // Ancestors are only known once the image is in the DOM.
  useEffect(() => {
    setZoomable(!!src && !ref.current?.closest(NON_ZOOMABLE_ANCESTORS));
  }, [src]);

  const triggerProps = zoomable
    ? {
        className: mergeClassNames(
          imageProps.className,
          'image-lightbox-trigger',
        ),
        role: 'button',
        tabIndex: 0,
        'aria-label': alt ? `Enlarge image: ${alt}` : 'Enlarge image',
        onClick: () => setOpen(true),
        onKeyDown: (event: KeyboardEvent<HTMLImageElement>) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          setOpen(true);
        },
      }
    : {};

  return (
    <>
      {optimized ? (
        <Image ref={ref} {...(imageProps as ImageProps)} {...triggerProps} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img
          ref={ref}
          {...(imageProps as ImgHTMLAttributes<HTMLImageElement>)}
          {...triggerProps}
        />
      )}
      {open &&
        createPortal(
          <Lightbox
            src={src}
            alt={alt}
            origin={ref.current}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

/**
 * Full-size view in a native modal dialog. When motion is allowed, the image
 * grows out of its spot on the page (`origin`) and shrinks back on close, while
 * the backdrop fades.
 */
function Lightbox({
  src,
  alt,
  origin,
  onClose,
}: {
  src: string;
  alt: string;
  origin: HTMLImageElement | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const animations = useRef<Animation[]>([]);
  const closing = useRef(false);
  // The original can be large; show a spinner until it has loaded.
  const [loading, setLoading] = useState(true);

  // Restores the page image and unmounts. Safe to call more than once.
  const finish = () => {
    if (origin) origin.style.visibility = '';
    // Close natively before unmounting so the browser returns focus to the
    // image that opened it (removing an open dialog skips that).
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose();
  };

  // Layout effect so the image can be hidden before the first paint.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const image = imageRef.current;
    if (!dialog || !image) return;
    if (!dialog.open) dialog.showModal();
    const animate = canAnimate(dialog);

    let cancelled = false;
    if (animate) {
      animations.current = [
        dialog.animate(
          { opacity: [0, 1] },
          { ...ANIMATION, pseudoElement: '::backdrop' },
        ),
      ];
      // Hidden until loaded so it can be measured, then grown into place.
      image.style.opacity = '0';
    }
    void decodeImage(image).then(() => {
      if (cancelled) return;
      setLoading(false);
      if (!animate || closing.current || !image.isConnected) return;
      image.style.opacity = '';
      const from = origin && onScreen(origin) ? visibleRect(origin) : null;
      const to = visibleRect(image);
      animations.current.push(
        image.animate(
          from
            ? { transform: [transformFrom(from, to), 'none'] }
            : { opacity: [0, 1] },
          ANIMATION,
        ),
      );
      if (from && origin) origin.style.visibility = 'hidden';
    });

    // Undo everything so a re-run (e.g. React Strict Mode) starts clean.
    // Otherwise a leftover transform skews the next measurement.
    return () => {
      cancelled = true;
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
      image.style.opacity = '';
      if (origin) origin.style.visibility = '';
    };
  }, [origin]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const dialog = dialogRef.current;
    const image = imageRef.current;
    if (!dialog || !image || !canAnimate(dialog)) return finish();

    const running = animations.current.filter(
      (animation) => animation.playState === 'running',
    );
    let closeAnimations: Animation[];
    if (running.length > 0) {
      // Closed mid-open: play the open animation back to where it started.
      running.forEach((animation) => animation.reverse());
      closeAnimations = running;
    } else {
      animations.current.forEach((animation) => animation.cancel());
      // Still loading: the image has no size yet, so just fade out.
      const to =
        !loading && origin && onScreen(origin) ? visibleRect(origin) : null;
      const from = visibleRect(image);
      closeAnimations = [
        dialog.animate(
          { opacity: [1, 0] },
          { ...ANIMATION, pseudoElement: '::backdrop' },
        ),
        image.animate(
          to
            ? { transform: ['none', transformFrom(to, from)] }
            : { opacity: [1, 0] },
          ANIMATION,
        ),
      ];
    }
    void Promise.all(closeAnimations.map((animation) => animation.finished))
      .catch(() => undefined)
      .then(finish);
  };

  return (
    <dialog
      ref={dialogRef}
      className="image-lightbox"
      aria-label={alt || 'Enlarged image'}
      aria-busy={loading}
      // Esc: animate out instead of closing instantly.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      // Fallback if the browser closes the dialog anyway (e.g. Esc pressed twice).
      onClose={finish}
      // Clicking anywhere (backdrop or image) closes it.
      onClick={close}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} src={src} alt={alt} />
      {loading && <span className="image-lightbox-spinner" aria-hidden />}
    </dialog>
  );
}

const canAnimate = (element: Element): boolean =>
  typeof element.animate === 'function' &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Resolves once the image can be measured; never rejects. */
const decodeImage = (image: HTMLImageElement): Promise<void> =>
  typeof image.decode === 'function'
    ? image.decode().catch(() => undefined)
    : Promise.resolve();

const onScreen = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.top < window.innerHeight
  );
};

/**
 * The box an image's pixels actually cover. next/image `fill` images sit in a
 * larger box with `object-fit: contain`, so the box itself would be too big.
 */
const visibleRect = (image: HTMLImageElement): DOMRect => {
  const box = image.getBoundingClientRect();
  const { naturalWidth, naturalHeight } = image;
  if (
    !naturalWidth ||
    !naturalHeight ||
    getComputedStyle(image).objectFit !== 'contain'
  ) {
    return box;
  }
  const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return new DOMRect(
    box.x + (box.width - width) / 2,
    box.y + (box.height - height) / 2,
    width,
    height,
  );
};

/** CSS transform that makes an element laid out at `to` appear at `from`. */
const transformFrom = (from: DOMRect, to: DOMRect): string => {
  const dx = from.x + from.width / 2 - (to.x + to.width / 2);
  const dy = from.y + from.height / 2 - (to.y + to.height / 2);
  const scale = from.width / to.width;
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
};

const mergeClassNames = (...classNames: Array<string | undefined>): string =>
  classNames.filter(Boolean).join(' ');
