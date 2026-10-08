import { GlobeIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FooterNavigationGroup, SocialLink } from '@/components/types';
import { FooterErrorBoundary } from './footer-error-boundary';
import { socialIcons } from './social-icons';

interface FooterProps {
  siteName?: string;
  navigation?: FooterNavigationGroup[];
  social?: SocialLink[];
  /**
   * Rendered `_footer.html` (Premium). When set, it replaces the whole default
   * footer body: site name, copyright, social links and footer navigation.
   */
  customContent?: ReactNode;
}

export default async function Footer({
  siteName,
  navigation,
  social,
  customContent,
}: FooterProps) {
  const defaultFooter = (
    <DefaultFooter
      siteName={siteName}
      navigation={navigation}
      social={social}
    />
  );

  if (customContent) {
    return (
      <FooterErrorBoundary fallback={defaultFooter}>
        <footer
          className="site-footer site-footer--custom"
          aria-labelledby="footer"
        >
          <div className="site-footer-inner">
            <p id="footer" className="sr-only">
              Footer
            </p>
            <div className="site-footer-custom">{customContent}</div>
          </div>
        </footer>
      </FooterErrorBoundary>
    );
  }

  return defaultFooter;
}

function DefaultFooter({
  siteName,
  navigation,
  social,
}: Omit<FooterProps, 'customContent'>) {
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
                {social.map(({ label, name, href }) => {
                  if (!href) return null;
                  const Icon = (label && socialIcons[label]) || GlobeIcon;
                  return (
                    <Link
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name || label || 'Social link'}
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
                {navigation.map((group) => {
                  // Only render groups shaped as { title, links: [...] }. Guards
                  // against malformed config (e.g. a flat list of links, or a
                  // group with no `links` array) that would otherwise throw and
                  // 500 the whole page, since Footer renders in the layout.
                  if (
                    !Array.isArray(group?.links) ||
                    group.links.length === 0
                  ) {
                    return null;
                  }
                  return (
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
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
