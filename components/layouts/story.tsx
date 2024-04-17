import { StoryPageMetadata } from "@/server/api/types";

interface Props extends React.PropsWithChildren {
  metadata: StoryPageMetadata;
}

/* interface Author {
 *   name: string;
 *   avatar: string;
 *   urlPath: string;
 * } */

// copied over from https://github.com/datopian/portaljs/blob/main/packages/core/src/ui/BlogLayout/BlogLayout.tsx
export const DataStoryLayout: React.FC<Props> = ({ children, metadata }) => {
  const { title, description, date, authors } = metadata;

  return (
    <article className="prose-headings:font-headings prose mx-auto max-w-3xl px-6 pt-12 dark:prose-invert lg:prose-xl prose-headings:font-medium prose-a:break-words">
      <header className="flex flex-col gap-y-5">
        <h1 className="!mb-2">{title}</h1>
        <p className="not-prose text-xl font-light text-primary/75 md:text-2xl">
          {description}
        </p>
        {(authors || date) && (
          <div className="flex items-center gap-x-3 border-b border-t border-primary/10 py-2 text-sm text-primary/75">
            {authors?.length && (
              <div className="flex items-center gap-x-3">
                {authors.map((author) => (
                  <Avatar key={author} name={author} />
                ))}
              </div>
            )}
            {date && <time dateTime={date}>{formatDate(date)}</time>}
          </div>
        )}
      </header>
      <section>{children}</section>
    </article>
  );
};

interface AvatarProps {
  name: string;
  img?: string;
  href?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, img, href }) => {
  const Component = href ? "a" : "div";
  return (
    <Component href={href} className="group block flex-shrink-0">
      <div className="flex items-center space-x-2">
        {img && (
          <img
            className="inline-block h-9 w-9 rounded-full"
            src={img}
            alt={name}
          />
        )}
        <span className="text-sm font-medium text-primary dark:text-primary-dark">
          {name}
        </span>
      </div>
    </Component>
  );
};

const formatDate = (date: string, locales = "en-US") => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(date).toLocaleDateString(locales, options);
};
