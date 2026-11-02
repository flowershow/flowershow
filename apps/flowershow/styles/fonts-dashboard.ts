// Fonts are self-hosted so `next build` never fetches from Google Fonts, which
// intermittently returns CSS that next/font/google can't parse and fails the
// build. The latin subset is loaded via next/font/local (preloaded, with a
// metric-adjusted fallback); the other subsets come from fontsource's
// unicode-range faces, listed first in the fallback stack.
import '@fontsource-variable/inter/wght.css';
import localFont from 'next/font/local';

export const fontDashboardBody = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--next-font-dashboard-body',
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

export const fontDashboardHeading = localFont({
  src: './CalSans-SemiBold.otf',
  variable: '--next-font-dashboard-heading',
  weight: '600',
  display: 'swap',
  fallback: [
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
