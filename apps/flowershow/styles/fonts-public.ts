// Self-hosted for the same reason as fonts-dashboard.ts: latin via
// next/font/local, other subsets via fontsource's unicode-range faces.
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/lora/wght.css';
import localFont from 'next/font/local';

export const fontBody = localFont({
  src: '../node_modules/@fontsource-variable/lora/files/lora-latin-wght-normal.woff2',
  variable: '--next-font-body',
  weight: '400 600',
  display: 'swap',
  fallback: [
    'Lora Variable',
    'Lora',
    'ui-serif',
    'Georgia',
    'Cambria',
    'Times New Roman',
    'Times',
    'serif',
  ],
});

export const fontHeading = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--next-font-heading',
  weight: '200 600',
  display: 'swap',
  fallback: [
    'Inter Variable',
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'Noto Sans',
    'Liberation Sans',
    'sans-serif',
  ],
});

export const fontBrand = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--next-font-brand',
  weight: '200 600',
  display: 'swap',
  fallback: [
    'Inter Variable',
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'Noto Sans',
    'Liberation Sans',
    'sans-serif',
  ],
});
