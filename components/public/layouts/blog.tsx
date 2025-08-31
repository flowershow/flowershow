import Link from "next/link";
import { CalendarIcon } from "lucide-react";

interface Props extends React.PropsWithChildren {
  title: string;
  description?: string;
  image?: string;
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
  image,
  showHero = false,
  date,
  authors,
}) => {
  const formattedDate = date ? formatDate(date) : null;

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
                        <img
                          key={author.key}
                          alt={author.name}
                          src={author.avatar}
                          className="page-header-author-avatar"
                        />
                      ),
                  )}
                </div>
                <div className="page-header-authors-names-container">
                  {authors.map((author, index) => (
                    <>
                      {index > 0 && <span className="mr-1">,</span>}
                      {author.url ? (
                        <Link
                          className="page-header-author-name"
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
                    </>
                  ))}
                </div>
              </div>
            )}

            {date && formattedDate && (
              <div className="page-header-date">
                <CalendarIcon className="page-header-date-icon" />
                <time dateTime={new Date(date).toISOString()}>
                  {formattedDate}
                </time>
              </div>
            )}
          </div>

          {image && (
            <div className="page-header-image-container">
              <img
                alt="Featured image"
                src={image}
                className="page-header-image"
              />
            </div>
          )}
        </header>
      )}
      <div className="page-body">{children}</div>
    </>
  );
};

const formatDate = (
  date: string | undefined,
  locales = "en-US",
): string | null => {
  if (!date) return null;

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return new Date(date).toLocaleDateString(locales, options);
};
