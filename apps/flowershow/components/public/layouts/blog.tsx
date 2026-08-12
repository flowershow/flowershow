import { CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { safeDate } from '@/lib/utils';

interface Props extends React.PropsWithChildren {
  title: string;
  description?: string;
  showHero?: boolean;
  date?: string;
  authors?: {
    key: string;
    name: string;
    url: string | null;
    avatar?: string;
  }[];
}

export const BlogLayout: React.FC<Props> = ({
  children,
  title,
  description,
  showHero = false,
  date,
  authors,
}) => {
  const parsedDate = safeDate(date);

  return (
    <>
      {!showHero && (
        <header className="page-header">
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
          </div>
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
