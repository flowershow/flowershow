import { PageMetadata } from "@/server/api/types";

interface Props extends React.PropsWithChildren {
  metadata: PageMetadata;
  resolveAssetUrl: (url: string) => string;
}

export const WikiLayout: React.FC<Props> = ({
  children,
  metadata,
  resolveAssetUrl,
}) => {
  const { title, description, image, showHero, date, authors } = metadata;

  const formattedDate = date ? formatDate(date) : null;

  return (
    <article>
      {!showHero && (
        <header className="mb-8 space-y-4" data-testid="wiki-header">
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

          {authors && <p className="">By {authors.join(", ")}</p>}

          {description && (
            <p className="text-lg font-light text-primary-subtle sm:text-xl">
              {description}
            </p>
          )}

          {image && (
            <img
              alt="Featured image"
              src={resolveAssetUrl(image)}
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
