/* import { Mermaid as mermaid, Pre as pre } from "@portaljs/core"; */
/* import { ErrorBoundary } from "react-error-boundary"; */
import { ErrorMessage } from "@/components/error-message";
import { PageMetadata, isDatasetPage } from "@/server/api/types";
import { resolveLink } from "@/lib/resolve-link";
import { Site } from "@prisma/client";
import { env } from "@/env.mjs";
import { customEncodeUrl } from "@/lib/url-encoder";

import { Catalog } from "./portaljs-components";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

export const mdxComponentsFactory = ({
  metadata,
  siteMetadata,
}: {
  metadata: PageMetadata;
  siteMetadata: SiteWithUser;
}) => {
  const pathToR2SiteFolder = `https://${env.NEXT_PUBLIC_R2_BUCKET_DOMAIN}/${siteMetadata.id}/${siteMetadata.gh_branch}/raw`;

  const components: any = {
    /* HTML elements */
    a: ({
      href,
      children,
      ...rest
    }: React.LinkHTMLAttributes<HTMLAnchorElement>) => {
      if (!href) {
        return <a {...rest}>{children}</a>;
      }

      const isExternal = href.startsWith("http");
      const isHeading = href.startsWith("#");

      const _href = isHeading
        ? href
        : resolveLink({
            link: isExternal ? href : customEncodeUrl(href),
            filePath: metadata._path,
            prefixPath: siteMetadata.customDomain
              ? ""
              : `/@${siteMetadata.user!.gh_username}/${
                  siteMetadata.projectName
                }`,
          });

      return (
        <a
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          href={_href}
          {...rest}
        >
          {children}
        </a>
      );
    },
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      if (!props.src) {
        return <img {...props} />;
      }

      const normalizedSrc = resolveLink({
        link: props.src,
        filePath: metadata._path,
        prefixPath: pathToR2SiteFolder,
      });

      return <img {...props} src={normalizedSrc} />;
    },
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="overflow-x-auto">
        <table {...props} />
      </div>
    ),
    /* Custom components */
    /* pre,
     * mermaid, */
    code: (props) => {
      let className = props.className;
      if (!props.className || !props.className.includes("language-")) {
        // Set default className to "language-auto" if not found
        className = props.className
          ? `${props.className} language-auto`
          : "language-auto";
      }

      return <code {...props} className={className}></code>;
    },
    Catalog: (props) => {
      return <Catalog {...props} />;
    },
  };

  return components;
};

const FallbackComponentFactory = ({ title }: { title: string }) => {
  const FallbackComponent = ({ error }: { error: Error }) => {
    return <ErrorMessage title={title} message={error.message} />;
  };
  FallbackComponent.displayName = "FallbackComponent";
  return FallbackComponent;
};

FallbackComponentFactory.displayName = "FallbackComponentFactory";
