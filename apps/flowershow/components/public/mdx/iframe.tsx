import { PdfViewer } from './mdx-client-components';

// `<iframe>` in page content (HTML iframes and `![[doc.pdf]]` embeds): PDFs get
// the PDF viewer, anything else stays a plain iframe.
export function Iframe(props: React.IframeHTMLAttributes<HTMLIFrameElement>) {
  const src = props.src ?? '';

  const isPdf = typeof src === 'string' && src.split('#')[0]?.endsWith('.pdf');

  if (isPdf) {
    return <PdfViewer src={src} />;
  }

  return <iframe {...props} />;
}
