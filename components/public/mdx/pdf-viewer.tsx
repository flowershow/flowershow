'use client';

import { useCallback, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Tell pdf.js where to load its worker from
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({ src }: { src: string }) {
  const [numPages, setNumPages] = useState<number>(0);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  return (
    <div className="pdf-viewer">
      <div className="pdf-header">
        <div className="pdf-page-count">
          {numPages > 0 ? `${numPages} pages` : 'Loading…'}
        </div>
        <div className="pdf-filename">
          {src.split('/').pop()?.split('#')[0]}
        </div>
      </div>

      <div className="pdf-scroll-area">
        <Document
          file={src}
          onLoadSuccess={onLoadSuccess}
          loading={<div className="pdf-loading">Loading PDF…</div>}
          error={
            <div className="pdf-error">
              Failed to load PDF. (Is the path correct / public?)
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="pdf-page">
              <Page
                pageNumber={i + 1}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
