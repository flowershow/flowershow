import { WikiPageMetadata } from "@/server/api/types";
import { resolveLink } from "@/lib/resolve-link";
import { SiteWithUser } from "@/types";

interface Props extends React.PropsWithChildren {
  metadata: WikiPageMetadata;
  siteMetadata: SiteWithUser;
}

export const WikiLayout: React.FC<Props> = ({
  children,
  metadata,
  siteMetadata,
}) => {
  const { title, description, image } = metadata;

  const rawFilePermalinkBase = siteMetadata.customDomain
    ? `/_r/-`
    : `/@${siteMetadata.user!.gh_username}/${siteMetadata.projectName}` +
      `/_r/-`;

  const resolveDataUrl = (url: string) =>
    resolveLink({
      link: url,
      filePath: metadata._path,
      prefixPath: rawFilePermalinkBase,
    });

  return (
    <article>
      <header data-testid="story-header">
        {title && (
          <h1 className="mb-6 text-4xl font-semibold leading-none tracking-tight text-primary-strong sm:text-5xl">
            {title}
          </h1>
        )}

        {description && (
          <p className="text-lg font-light text-primary-subtle sm:text-xl">
            {description}
          </p>
        )}

        {image && (
          <img
            alt="Hero image"
            src={resolveDataUrl(image)}
            className="my-8 w-full rounded-md object-cover"
          />
        )}
      </header>
      <section className="prose mt-12 max-w-none font-light leading-tight text-primary dark:prose-invert prose-headings:font-title prose-headings:tracking-tight prose-headings:text-primary-strong prose-a:break-words">
        {children}
      </section>
    </article>
  );
};
