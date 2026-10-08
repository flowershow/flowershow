import { tagToHref } from '@flowershow/core';
import { CalendarIcon, ChevronRightIcon, ClockIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { Breadcrumb } from '@/lib/breadcrumbs';
import { safeDate } from '@/lib/utils';

interface Props extends React.PropsWithChildren {
  title: string;
  description?: string;
  showHero?: boolean;
  date?: string;
  /** Pre-computed label, e.g. "8 min read". Omitted when reading time is off. */
  readingTime?: string;
  /** Trail shown above the title; the last crumb is the current page. */
  breadcrumbs?: Breadcrumb[];
  authors?: {
    key: string;
    name: string;
    url: string | null;
    avatar?: string;
  }[];
  /** Frontmatter tags, rendered as a pill row in the header. */
  tags?: string[];
}

export const BlogLayout: React.FC<Props> = ({
  children,
  title,
  description,
  showHero = false,
  date,
  readingTime,
  breadcrumbs,
  authors,
  tags,
}) => {
  const parsedDate = safeDate(date);

  return (
    <>
      {!showHero && (
        <header className="page-header">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="page-header-breadcrumbs">
              <ol className="page-header-breadcrumbs-list">
                {breadcrumbs.map((crumb, i) => {
                  const isCurrent = i === breadcrumbs.length - 1;
                  return (
                    <li
                      key={`${i}-${crumb.label}`}
                      className="page-header-breadcrumb-item"
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      {i > 0 && (
                        <ChevronRightIcon
                          className="page-header-breadcrumb-separator"
                          aria-hidden="true"
                        />
                      )}
                      {crumb.href && !isCurrent ? (
                        <Link
                          href={crumb.href}
                          className="page-header-breadcrumb-link"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span>{crumb.label}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          {title && <h1 className="page-header-title">{title}</h1>}

          {description && (
            <p className="page-header-description">{description}</p>
          )}

          <div className="page-header-metadata-container">
            {authors && (
              <div className="page-header-authors-container">
                <div className="page-header-authors-avatars-container">
                  {authors.map(
                    (author) =>
                      author.avatar && (
                        <Image
                          key={author.key}
                          alt={author.name}
                          src={author.avatar}
                          width={24}
                          height={24}
                          className="page-header-author-avatar"
                        />
                      ),
                  )}
                </div>
                <div className="page-header-authors-names-container">
                  {authors.map((author, index) => (
                    <span
                      key={author.key}
                      className="page-header-author-name-wrapper"
                    >
                      {index > 0 &&
                        (index < authors.length - 1 ? (
                          <span className="mr-1">,</span>
                        ) : (
                          <span className="mx-1">and</span>
                        ))}
                      {author.url ? (
                        <Link
                          className="page-header-author-name .is-linked"
                          key={author.key}
                          href={author.url}
                        >
                          {author.name}
                        </Link>
                      ) : (
                        <span
                          className="page-header-author-name"
                          key={author.key}
                        >
                          {author.name}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {date && (
              <div className="page-header-date">
                <CalendarIcon className="page-header-date-icon" />
                {parsedDate ? (
                  <time dateTime={parsedDate.toISOString()}>
                    {formatDate(parsedDate)}
                  </time>
                ) : (
                  // Not a parseable date (e.g. a range like "1964-1982"); render
                  // the raw frontmatter value rather than crashing the render.
                  <span>{date}</span>
                )}
              </div>
            )}

            {readingTime && (
              <div className="page-header-reading-time">
                <ClockIcon className="page-header-reading-time-icon" />
                <span>{readingTime}</span>
              </div>
            )}
          </div>

          {tags && tags.length > 0 && (
            <div className="page-header-tags">
              {tags.map((tag) => (
                <Link key={tag} href={tagToHref(tag)} className="tag-pill">
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </header>
      )}
      <div className="page-body">{children}</div>
    </>
  );
};

const formatDate = (date: Date, locales = 'en-US'): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return date.toLocaleDateString(locales, options);
};
