import { BlogPageMetadata } from "@/server/api/types";
import { SocialShare } from "../social-share";
import { SiteWithUser } from "@/types";

interface Props extends React.PropsWithChildren {
  metadata: BlogPageMetadata;
}

export const BlogLayout: React.FC<Props> = ({ children, metadata }) => {
  const { title, description, date } = metadata;

  const formattedDate = date ? formatDate(date) : null;

  return (
    <article>
      <header data-testid="story-header">
        {date && formattedDate && (
          <div className="mb-2 font-light">
            Published{" "}
            <time dateTime={new Date(date).toISOString()}>{formattedDate}</time>
          </div>
        )}

        {title && (
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
            {title}
          </h1>
        )}

        {description && (
          <p className="text-lg font-light text-primary-subtle md:text-xl">
            {description}
          </p>
        )}

        <SocialShare title={title || ""} />
      </header>
      <section className="prose prose-lg mt-12 max-w-none font-body dark:prose-invert lg:prose-xl prose-headings:font-title prose-headings:font-bold prose-headings:tracking-tight prose-a:break-words">
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
