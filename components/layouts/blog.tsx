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
        <header className="mb-8 space-y-6" data-testid="blog-header">
          <div className="space-y-2">
            {date && formattedDate && (
              <div className="font-light text-primary/70">
                Published{" "}
                <time dateTime={new Date(date).toISOString()}>
                  {formattedDate}
                </time>
              </div>
            )}

            {title && (
              <h1 className="text-[3rem] font-semibold leading-[3.25rem] tracking-tight text-primary-emphasis text-primary-strong sm:text-[3.5rem] sm:leading-[3.75rem]">
                {title}
              </h1>
            )}
          </div>

          {authors && (
            <div className="flex space-x-3">
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
                      <a href={href || "#"} className={className}>
                        {children}
                      </a>
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
                    className="group inline-block shrink-0"
                  >
                    <div className="flex items-center">
                      {author.avatar && (
                        <div>
                          <img
                            alt={author.name}
                            src={author.avatar}
                            className="inline-block h-8 w-8 rounded-full"
                          />
                        </div>
                      )}
                      <div className="ml-2">
                        <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                          {author.name}
                        </p>
                      </div>
                    </div>
                  </AuthorWrapper>
                );
              })}
            </div>
          )}

          {description && (
            <p className="text-lg font-light text-primary-subtle sm:text-xl">
              {description}
            </p>
          )}

          {image && (
            <img
              alt="Featured image"
              src={image}
              className="w-full rounded-md object-cover"
            />
          )}

          <div className="border-b pb-4" />
        </header>
      )}
      <section className="prose max-w-none font-body font-normal text-primary dark:prose-invert prose-headings:font-title prose-headings:tracking-tight prose-headings:text-primary-strong prose-a:break-words">
        {children}
      </section>
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
