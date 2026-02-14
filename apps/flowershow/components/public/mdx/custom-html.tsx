'use client';
import { useEffect, useRef } from 'react';

export type CustomHtmlProps = {
  html: string;
};

export const CustomHtml = ({ html }: CustomHtmlProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1) Render raw HTML on both server & client
  //    so your links, styles, markup all exist in the SSR output.
  // 2) Then in useEffect, find any <script> tags and replace
  //    them with fresh ones so the browser will execute them.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // find any scripts in the injected HTML
    const scripts = Array.from(el.querySelectorAll('script'));
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      // copy attributes (src, type, async, etc.)
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value),
      );
      // copy inline content
      newScript.text = oldScript.text;
      // replace the old inert <script> with an active one
      oldScript.replaceWith(newScript);
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      // server + client markup match exactly
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
