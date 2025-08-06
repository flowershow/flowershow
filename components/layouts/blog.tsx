import { Blob } from "@prisma/client";

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
    <article>
      {!showHero && (
        <header
          className="blog-header mb-8 space-y-2 border-b pb-8 font-inter"
          data-testid="blog-header"
        >
          {date && formattedDate && (
            <div className="blog-date font-light text-primary/70">
              Published{" "}
              <time dateTime={new Date(date).toISOString()}>
                {formattedDate}
              </time>
            </div>
          )}

          {title && (
            <h1 className="blog-title text-[3rem] font-semibold leading-[3.25rem] tracking-tight text-primary-emphasis text-primary-strong sm:text-[3.5rem] sm:leading-[3.75rem]">
              {title}
            </h1>
          )}

          {authors && (
            <div className="blog-authors flex space-x-3 py-2">
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
                      <div className={className} data-testid="blog-author">
                        <a href={href || "#"} data-testid="blog-author">
                          {children}
                        </a>
                      </div>
                    )
                  : ({
                      children,
                      className,
                    }: {
                      children: React.ReactNode;
                      className?: string;
                    }) => (
                      <div className={className} data-testid="blog-author">
                        {children}
                      </div>
                    );

                return (
                  <AuthorWrapper
                    key={author.key}
                    href={author.url}
                    className="blog-author group inline-block flex shrink-0 items-center"
                  >
                    {author.avatar && (
                      <img
                        alt={author.name}
                        src={author.avatar}
                        className="blog-author-avatar inline-block h-8 w-8 rounded-full"
                      />
                    )}
                    <span className="blog-author-name ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {author.name}
                    </span>
                  </AuthorWrapper>
                );
              })}
            </div>
          )}

          {description && (
            <p className="blog-description text-lg font-light text-primary-subtle sm:text-xl">
              {description}
            </p>
          )}

          {image && (
            <div className="blog-image-wrapper w-full py-3">
              <img
                alt="Featured image"
                src={image}
                className="blog-image rounded-md object-cover"
              />
            </div>
          )}
        </header>
      )}
      <div className="prose max-w-none font-lora font-normal text-primary dark:prose-invert prose-headings:font-inter prose-headings:tracking-tight prose-headings:text-primary-strong prose-a:break-words">
        {children}
      </div>
    </article>
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
