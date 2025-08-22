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
          {date && formattedDate && (
            <div className="page-header-date">
              Published{" "}
              <time dateTime={new Date(date).toISOString()}>
                {formattedDate}
              </time>
            </div>
          )}

          {title && <h1 className="page-header-title">{title}</h1>}

          {authors && (
            <div className="page-header-authors-container">
              {authors.map((author) => {
                const AuthorWrapper = author.url
                  ? ({
                      children,
                      href,
                      className,
                    }: {
                      children: React.ReactNode;
                      href: string | null;
                      className?: string;
                    }) => (
                      <div className={className}>
                        <a href={href || "#"}>{children}</a>
                      </div>
                    )
                  : ({
                      children,
                      className,
                    }: {
                      children: React.ReactNode;
                      className?: string;
                    }) => <div className={className}>{children}</div>;

                return (
                  <AuthorWrapper
                    key={author.key}
                    href={author.url}
                    className="page-header-author"
                  >
                    {author.avatar && (
                      <img
                        alt={author.name}
                        src={author.avatar}
                        className="page-header-author-avatar"
                      />
                    )}
                    <span className="page-header-author-name">
                      {author.name}
                    </span>
                  </AuthorWrapper>
                );
              })}
            </div>
          )}

          {description && (
            <p className="page-header-description">{description}</p>
          )}

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
      <div className="page-body prose dark:prose-invert prose-headings:font-heading prose-headings:tracking-tight prose-headings:text-primary-strong prose-a:break-words">
        {children}
      </div>
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
