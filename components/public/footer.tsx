import Link from 'next/link';
import { getConfig } from '@/lib/app-config';
import { api } from '@/trpc/server';

const config = getConfig();

interface FooterProps {
  siteId?: string;
}

export default async function Footer({ siteId }: FooterProps) {
  // Try to fetch custom footer
  let customFooterContent: string | null = null;

  if (siteId) {
    try {
      const customFooterBlob = await api.site.getBlobByPath.query({
        siteId,
        path: '_flowershow/components/Footer.html',
      });

      if (customFooterBlob) {
        customFooterContent = await api.site.getBlobContent.query({
          id: customFooterBlob.id,
        });
      }
    } catch (error) {
      // Custom footer doesn't exist, will use default
    }
  }

  // If custom footer exists, render it as HTML
  if (customFooterContent) {
    return (
      <>
        <p id="footer" className="sr-only">
          Footer
        </p>
        <div
          id="customfooter"
          dangerouslySetInnerHTML={{ __html: customFooterContent }}
        />
      </>
    );
  }

  // Default footer
  return (
    <footer className="site-footer" aria-labelledby="footer">
      <div className="site-footer-inner">
        <p id="footer" className="sr-only">
          Footer
        </p>
        <div className="site-footer-copyright">
          <span>&copy; 2025 All rights reserved</span>
          <svg
            viewBox="0 0 2 2"
            aria-hidden="true"
            className="site-footer-copyright-icon"
          >
            <circle r={1} cx={1} cy={1} />
          </svg>
        </div>
        <div className="site-footer-built-with">
          Built with <Link href={config.landingPageUrl}>{config.title}</Link>
        </div>
      </div>
    </footer>
  );
}
