import { GlobeIcon } from 'lucide-react';
import Link from 'next/link';
import { FooterNavigationGroup, SocialLink } from '@/components/types';
import { getConfig } from '@/lib/app-config';
import { api } from '@/trpc/server';
import { socialIcons } from './social-icons';

interface FooterProps {
  siteId?: string;
  siteName?: string;
  navigation?: FooterNavigationGroup[];
  social?: SocialLink[];
}

export default async function Footer({
  siteId,
  siteName,
  navigation,
  social,
}: FooterProps) {
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

  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-labelledby="footer">
      <div className="site-footer-inner">
        <p id="footer" className="sr-only">
          Footer
        </p>

        <div className="site-footer-content-grid">
          {/* Section A: Publication Info */}
          <div className="site-footer-publication-section">
            <h3 className="site-footer-publication-name">{siteName}</h3>
            <p className="site-footer-copyright">
              &copy; {currentYear} {siteName}. All rights reserved.
            </p>
            {social && (
              <div className="site-footer-social-links">
                {social.map(({ label, href }, index) => {
                  const Icon = (label && socialIcons[label]) || GlobeIcon;
                  return (
                    <Link
                      key={`${href}-${index}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="site-footer-social-link"
                    >
                      <Icon className="site-footer-social-icon" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Platform Links */}
          {navigation && navigation.length > 0 && (
            <div className="site-footer-navigation-section">
              <div className="site-footer-navigation-grid">
                {navigation.map((group) => (
                  <div
                    key={group.title}
                    className="site-footer-navigation-group"
                  >
                    <h4 className="site-footer-navigation-title">
                      {group.title}
                    </h4>
                    <ul role="list" className="site-footer-navigation-list">
                      {group.links.map((link) => (
                        <li key={link.name}>
                          <Link
                            href={link.href}
                            className="site-footer-navigation-link"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
