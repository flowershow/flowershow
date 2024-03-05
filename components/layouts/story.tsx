interface Props extends React.PropsWithChildren {
  title: string;
  authors: string[];
  /* authors: Author[]; */
  date: string;
}

interface Author {
  name: string;
  avatar: string;
  /* urlPath: string; */
}

// copied over from https://github.com/datopian/portaljs/blob/main/packages/core/src/ui/BlogLayout/BlogLayout.tsx
export const DataStoryLayout: React.FC<Props> = ({
  children,
  ...frontMatter
}) => {
  const { title, date, authors } = frontMatter;

  return (
    <article className="prose mx-auto mt-20 max-w-3xl px-12 pb-20 text-primary prose-headings:font-medium">
      <header>
        <div className="mb-4 flex-col items-center">
          {title && <h1 className="flex justify-center">{title}</h1>}
          {date && (
            <p className="flex justify-center text-sm text-zinc-400 dark:text-zinc-500">
              <time dateTime={date}>{formatDate(date)}</time>
            </p>
          )}
          {authors && (
            <div className="not-prose flex flex-wrap items-center justify-center space-x-6 space-y-3">
              {/* {authors.map(({ name, avatar, urlPath }) => (
                                <Avatar
                                    key={urlPath || name}
                                    name={name}
                                    img={avatar}
                                    href={urlPath ? `/${urlPath}` : undefined}
                                />
                            ))} */}
              {authors.map((author) => (
                <Avatar key={author} name={author} />
              ))}
            </div>
          )}
        </div>
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
    <Component href={href} className="group mt-2 block flex-shrink-0">
      <div className="flex items-center space-x-2">
        {img && (
          <div>
            <img
              className="inline-block h-9 w-9 rounded-full"
              src={img}
              alt={name}
            />
          </div>
        )}
        <div className="ml-3">
          <p className="text-sm font-medium text-primary dark:text-primary-dark">
            {name}
          </p>
        </div>
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
