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
  const { title, description, image, showHero } = metadata;

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
      {!showHero && (
        <header className="mb-12" data-testid="story-header">
          {title && (
            <h1 className="text-primary-strong mb-6 text-4xl font-semibold leading-none tracking-tight sm:text-5xl">
              {title}
            </h1>
          )}

          {description && (
            <p className="text-primary-subtle text-lg font-light sm:text-xl">
              {description}
            </p>
          )}

          {image && (
            <img
              alt="Featured image"
              src={resolveDataUrl(image)}
              className="my-8 w-full rounded-md object-cover"
            />
          )}
        </header>
      )}
      <section className="prose-headings:text-primary-strong prose  max-w-none font-light leading-tight text-primary dark:prose-invert prose-headings:font-title prose-headings:tracking-tight prose-a:break-words">
        {children}
      </section>
    </article>
  );
};
